# 129. OAuth

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**OAuth (Open Authorization)** is an industry-standard authorization framework that enables third-party applications to obtain limited access to user accounts without exposing passwords. From a frontend perspective, OAuth is how you implement "Sign in with Google," "Login with GitHub," or "Connect to Spotify" features.

### **What It Is:**
OAuth 2.0 is a **delegation protocol** that allows users to grant applications access to their resources on another service without sharing credentials. It's about **authorization** (what you can access), not **authentication** (who you are), though OpenID Connect (OIDC) built on top of OAuth adds authentication.

### **Why It Exists:**
1. **Security**: Users don't share passwords with third-party apps
2. **Convenience**: Single Sign-On (SSO) across multiple services
3. **Granular Permissions**: Apps request specific scopes (read email, access calendar)
4. **Revocable Access**: Users can revoke access without changing passwords
5. **Third-Party Integration**: Safely connect apps (Slack + Google Drive)

### **When and Where Used:**
- **Social Login**: "Sign in with Google/Facebook/Twitter"
- **API Access**: Apps accessing user data on another platform
- **Enterprise SSO**: Corporate apps using company identity provider
- **Mobile Apps**: Native apps accessing backend resources
- **Microservices**: Service-to-service authorization

### **Role in Large-Scale Applications:**
At FAANG scale, OAuth powers:
- **Identity Federation**: One account across 100+ services (Google Workspace)
- **Third-Party Ecosystem**: 100K+ apps integrating via OAuth (GitHub Apps)
- **Compliance**: GDPR/HIPAA-compliant access delegation
- **Performance**: Stateless JWT tokens reduce database lookups
- **User Trust**: Transparent permission dialogs build user confidence

### **Frontend's Role:**
The frontend is responsible for:
1. **Initiating the flow** (redirecting to authorization server)
2. **Handling callbacks** (receiving authorization codes)
3. **Token management** (storing, refreshing access tokens)
4. **Error handling** (user denies permission, network failures)
5. **UX optimization** (popup vs redirect, loading states)

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. OAuth 2.0 Flows (Grant Types)**

#### **1. Authorization Code Flow (Most Common for Web SPAs)**

**Use Case:** Server-side web apps, SPAs with backend

```
┌──────────┐                                      ┌─────────────────┐
│          │                                      │                 │
│  User    │                                      │  Authorization  │
│  Browser │                                      │     Server      │
│          │                                      │   (Google/     │
└────┬─────┘                                      │    GitHub)      │
     │                                            └────────┬────────┘
     │ 1. Click "Login with Google"                      │
     │────────────────────────────────────>              │
     │                                                    │
     │ 2. Redirect to /authorize with:                   │
     │    - client_id, redirect_uri, scope, state        │
     │───────────────────────────────────────────────────>│
     │                                                    │
     │ 3. User authenticates & approves scopes           │
     │<───────────────────────────────────────────────────│
     │                                                    │
     │ 4. Redirect back with authorization code          │
     │<───────────────────────────────────────────────────│
     │    https://yourapp.com/callback?code=ABC&state=XYZ│
     │                                                    │
┌────▼─────┐                               ┌────────────▼───────┐
│          │  5. Exchange code for tokens  │                    │
│ Frontend │──────────────────────────────>│  Your Backend/BFF  │
│          │     POST /token               │                    │
│          │<──────────────────────────────│                    │
│          │  6. Returns access_token,     │                    │
│          │     refresh_token, id_token   │                    │
└──────────┘                               └────────────────────┘
```

**Why This Flow:**
- Authorization code is single-use and short-lived (10 min)
- Code can be intercepted but is useless without client_secret
- Tokens are never exposed in browser URL
- Supports refresh tokens for long-lived access

**Frontend Implementation:**
```javascript
// Step 1: Initiate OAuth flow
function initiateOAuthFlow() {
  const authorizationEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
  
  const params = new URLSearchParams({
    client_id: 'YOUR_CLIENT_ID',
    redirect_uri: 'https://yourapp.com/callback',
    response_type: 'code', // Authorization Code Flow
    scope: 'openid email profile',
    state: generateRandomState(), // CSRF protection
    code_challenge: generatePKCEChallenge(), // PKCE for SPAs
    code_challenge_method: 'S256'
  });
  
  // Save state and code_verifier in sessionStorage for validation
  sessionStorage.setItem('oauth_state', params.get('state'));
  sessionStorage.setItem('pkce_verifier', codeVerifier);
  
  // Redirect to authorization server
  window.location.href = `${authorizationEndpoint}?${params}`;
}
```

---

#### **2. Authorization Code Flow with PKCE (Recommended for SPAs)**

**PKCE (Proof Key for Code Exchange)** - RFC 7636

**Problem it solves:**
SPAs can't securely store `client_secret`. Attackers can intercept authorization codes via malicious apps (mobile) or browser extensions.

**How PKCE works:**
```javascript
// Generate random string
const codeVerifier = generateRandomString(128); // 43-128 chars

// Hash it with SHA-256
const codeChallenge = base64URLEncode(sha256(codeVerifier));

// Send challenge in /authorize request
// Send verifier in /token request
// Server verifies: sha256(verifier) === challenge
```

**Flow:**
```
1. Frontend generates code_verifier (random string)
2. Frontend derives code_challenge = SHA256(code_verifier)
3. Frontend sends code_challenge in /authorize request
4. Server stores code_challenge with authorization code
5. Frontend exchanges code + code_verifier for tokens
6. Server validates: SHA256(code_verifier) === stored code_challenge
7. Server returns tokens only if valid
```

**Why PKCE matters:**
- No `client_secret` needed (safe for public clients like SPAs)
- Even if authorization code is intercepted, attacker can't use it without `code_verifier`
- Recommended by OAuth 2.0 Security Best Practices (RFC 8252)

**Frontend Implementation:**
```javascript
// PKCE Helper Functions
function generateRandomString(length) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

async function generatePKCEChallenge() {
  const verifier = generateRandomString(128);
  const challenge = await sha256(verifier);
  return {
    verifier,
    challenge: base64URLEncode(challenge)
  };
}

// Step 1: Initiate OAuth with PKCE
async function initiateOAuthWithPKCE() {
  const { verifier, challenge } = await generatePKCEChallenge();
  const state = generateRandomString(32);
  
  // Store for later validation
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('pkce_verifier', verifier);
  
  const params = new URLSearchParams({
    client_id: 'YOUR_CLIENT_ID',
    redirect_uri: 'https://yourapp.com/callback',
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });
  
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// Step 2: Handle callback
async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');
  
  // Error handling
  if (error) {
    console.error('OAuth error:', error, params.get('error_description'));
    return;
  }
  
  // State validation (CSRF protection)
  const savedState = sessionStorage.getItem('oauth_state');
  if (state !== savedState) {
    throw new Error('State mismatch - possible CSRF attack');
  }
  
  // Exchange code for tokens
  const codeVerifier = sessionStorage.getItem('pkce_verifier');
  const tokens = await exchangeCodeForTokens(code, codeVerifier);
  
  // Clean up
  sessionStorage.removeItem('oauth_state');
  sessionStorage.removeItem('pkce_verifier');
  
  // Store tokens (see Token Storage best practices)
  await storeTokens(tokens);
  
  // Redirect to app
  window.location.href = '/dashboard';
}

async function exchangeCodeForTokens(code, codeVerifier) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: 'YOUR_CLIENT_ID',
      code: code,
      code_verifier: codeVerifier, // PKCE
      redirect_uri: 'https://yourapp.com/callback',
      grant_type: 'authorization_code'
    })
  });
  
  if (!response.ok) {
    throw new Error('Token exchange failed');
  }
  
  return await response.json();
  // Returns: { access_token, refresh_token, id_token, expires_in, token_type }
}
```

---

#### **3. Implicit Flow (DEPRECATED - Do NOT Use)**

**Flow:**
```
User → Authorization Server → Redirect with access_token in URL fragment
```

**Why deprecated:**
- Access token exposed in browser URL
- No refresh token support
- Token in browser history, server logs
- Vulnerable to token theft via referer headers

**Use Authorization Code + PKCE instead.**

---

#### **4. Client Credentials Flow (Backend-to-Backend)**

**Use Case:** Machine-to-machine, microservices, server-side jobs

**Flow:**
```javascript
// Backend only - never in frontend
const response = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  body: new URLSearchParams({
    client_id: 'YOUR_CLIENT_ID',
    client_secret: 'YOUR_SECRET', // Backend only!
    grant_type: 'client_credentials',
    scope: 'read:api'
  })
});
```

**Frontend never sees this** - used by backend services.

---

#### **5. Resource Owner Password Credentials (Legacy - Avoid)**

**Flow:** User enters username/password directly into third-party app.

**Why to avoid:**
- Defeats OAuth's purpose (password sharing)
- No consent screen
- Only for highly trusted first-party apps

---

### **B. OAuth Components & Their Roles**

#### **1. Resource Owner (User)**
The person who owns the data (e.g., user's Google Drive files).

#### **2. Client (Your Frontend App)**
The application requesting access to protected resources.
- **Public Client**: Cannot keep secrets (SPAs, mobile apps) → Use PKCE
- **Confidential Client**: Can keep secrets (server-side apps) → Use client_secret

#### **3. Authorization Server**
Issues tokens after authenticating user and obtaining consent.
- Examples: Google OAuth, GitHub OAuth, Auth0, Okta, Azure AD

#### **4. Resource Server (API)**
Hosts protected resources, validates access tokens.
- Example: Google Drive API, GitHub API

---

### **C. Token Types**

#### **1. Access Token**
- **Purpose:** Bearer token to access protected resources
- **Format:** Usually JWT (but can be opaque)
- **Lifespan:** Short (15 min - 1 hour)
- **Storage:** Memory (best) or LocalStorage (acceptable with precautions)
- **Usage:** `Authorization: Bearer <access_token>` header

**JWT Structure:**
```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

Header: { "alg": "RS256", "typ": "JWT" }
Payload: { "sub": "1234567890", "name": "John Doe", "iat": 1516239022 }
Signature: HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
```

#### **2. Refresh Token**
- **Purpose:** Obtain new access tokens without user interaction
- **Format:** Opaque string (random, not JWT)
- **Lifespan:** Long (days to months)
- **Storage:** HttpOnly Cookie (most secure) or encrypted storage
- **Usage:** POST to `/token` endpoint with `grant_type=refresh_token`

**Why separate tokens:**
- Access token: Short-lived, frequently used, higher exposure risk
- Refresh token: Long-lived, rarely used, stored more securely
- If access token leaked → expires quickly
- If refresh token leaked → can be revoked server-side

#### **3. ID Token (OpenID Connect)**
- **Purpose:** Prove user's identity (authentication)
- **Format:** JWT with user claims (email, name, picture)
- **Usage:** Frontend uses to display user info, not for API access
- **Validation:** Must verify signature, issuer, audience, expiry

**ID Token Claims:**
```json
{
  "iss": "https://accounts.google.com",
  "sub": "110169484474386276334",
  "aud": "YOUR_CLIENT_ID",
  "exp": 1516239022,
  "iat": 1516235422,
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/..."
}
```

---

### **D. OAuth Scopes**

**Scopes** define granular permissions the app requests.

**Examples:**
- Google: `email`, `profile`, `https://www.googleapis.com/auth/drive.readonly`
- GitHub: `repo`, `user:email`, `read:org`
- Facebook: `email`, `public_profile`, `user_friends`

**Frontend Flow:**
```javascript
const params = {
  scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
  // User sees: "YourApp wants to: View your email, View your calendar events"
};
```

**Best Practices:**
- Request **minimum necessary scopes** (principle of least privilege)
- Explain **why each scope is needed** (transparency)
- Request additional scopes incrementally (better UX)

**Incremental Authorization (Google):**
```javascript
// Initial login: minimal scopes
scope: 'email profile'

// Later, when user clicks "Connect Calendar"
scope: 'https://www.googleapis.com/auth/calendar.readonly'
prompt: 'consent' // Force consent screen even if already logged in
```

---

### **E. Security Considerations**

#### **1. State Parameter (CSRF Protection)**

**Attack Scenario:**
```
1. Attacker initiates OAuth flow with their account
2. Attacker captures the callback URL with authorization code
3. Attacker tricks victim into visiting that URL
4. Victim's session gets linked to attacker's account
5. Victim's data goes to attacker's account
```

**Defense:**
```javascript
// Generate random state
const state = crypto.randomUUID();
sessionStorage.setItem('oauth_state', state);

// Include in /authorize request
params.state = state;

// Validate on callback
if (params.get('state') !== sessionStorage.getItem('oauth_state')) {
  throw new Error('CSRF attack detected');
}
```

#### **2. Redirect URI Validation**

**Attack:** Attacker registers app with redirect_uri=https://evil.com

**Defense (Server-side):**
- Whitelist exact redirect URIs (no wildcards)
- Validate redirect_uri in both /authorize and /token requests
- Use HTTPS only

**Frontend:**
```javascript
// Always use exact registered URI
redirect_uri: 'https://yourapp.com/oauth/callback' // Must match registration
```

#### **3. Token Leakage Prevention**

**Vectors:**
- Browser history (Implicit Flow tokens in URL)
- Referer headers (if redirect to third-party)
- XSS (LocalStorage access)
- Browser extensions
- Developer tools

**Mitigations:**
- Use Authorization Code + PKCE (no tokens in URL)
- Store access tokens in memory
- Store refresh tokens in HttpOnly cookies
- Implement CSP (Content Security Policy)
- Clear tokens on logout

#### **4. Token Validation (ID Token)**

**Frontend must validate:**
```javascript
async function validateIdToken(idToken) {
  const decoded = jwt.decode(idToken, { complete: true });
  
  // 1. Verify signature (use JWKS from provider)
  const jwks = await fetchJWKS('https://accounts.google.com/.well-known/jwks.json');
  const publicKey = getKey(jwks, decoded.header.kid);
  const isValid = jwt.verify(idToken, publicKey);
  
  if (!isValid) throw new Error('Invalid signature');
  
  // 2. Verify issuer
  if (decoded.payload.iss !== 'https://accounts.google.com') {
    throw new Error('Invalid issuer');
  }
  
  // 3. Verify audience (your client_id)
  if (decoded.payload.aud !== 'YOUR_CLIENT_ID') {
    throw new Error('Invalid audience');
  }
  
  // 4. Verify expiry
  if (decoded.payload.exp < Date.now() / 1000) {
    throw new Error('Token expired');
  }
  
  // 5. Verify issued at (not too far in past/future)
  const now = Date.now() / 1000;
  if (decoded.payload.iat > now + 300 || decoded.payload.iat < now - 3600) {
    throw new Error('Invalid iat');
  }
  
  return decoded.payload;
}
```

**Library recommendation:** Use `jose` (npm) for production.

---

### **F. Browser Internals & OAuth**

#### **1. Redirect Flow**
```
window.location.href = authorizationURL;
→ Browser navigates away (full page reload)
→ User interacts with authorization server
→ Browser redirects back to callback URL
→ Frontend parses query params
```

**Performance impact:**
- Full page reload (loses JavaScript state)
- Network roundtrip (2-3 seconds typical)
- User sees authorization server UI

#### **2. Popup Flow (Better UX)**
```javascript
function initiateOAuthPopup() {
  const width = 500, height = 600;
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;
  
  const popup = window.open(
    authorizationURL,
    'OAuth Login',
    `width=${width},height=${height},left=${left},top=${top}`
  );
  
  // Poll for popup closure or message
  const checkPopup = setInterval(() => {
    if (popup.closed) {
      clearInterval(checkPopup);
      // Check if login succeeded (via localStorage flag or API call)
    }
  }, 500);
  
  // Or use postMessage for communication
  window.addEventListener('message', (event) => {
    if (event.origin !== 'https://yourapp.com') return;
    
    if (event.data.type === 'oauth_success') {
      const { code } = event.data;
      exchangeCodeForTokens(code);
    }
  });
}
```

**Trade-offs:**
- ✅ No page reload (preserves state)
- ✅ Better UX (parent page stays loaded)
- ❌ Popup blockers (user must allow)
- ❌ Mobile unfriendly (small screen)
- ❌ Accessibility issues

**Recommendation:** Redirect for initial login, popup for re-authorization.

---

### **G. Token Refresh Strategy**

```javascript
class TokenManager {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.refreshPromise = null;
  }
  
  async getAccessToken() {
    // If token exists and valid (with 1 min buffer)
    if (this.accessToken && this.tokenExpiry > Date.now() + 60000) {
      return this.accessToken;
    }
    
    // If refresh already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    // Start refresh
    this.refreshPromise = this.refreshToken();
    
    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }
  
  async refreshToken() {
    try {
      // Refresh token in HttpOnly cookie, sent automatically
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Refresh failed');
      }
      
      const { access_token, expires_in } = await response.json();
      
      this.accessToken = access_token;
      this.tokenExpiry = Date.now() + expires_in * 1000;
      
      return access_token;
    } catch (error) {
      // Refresh failed → logout
      this.logout();
      throw error;
    }
  }
  
  logout() {
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Call backend to revoke refresh token
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    window.location.href = '/login';
  }
}
```

---

### **H. Performance Optimization**

#### **1. Token Prefetching**
```javascript
// Proactively refresh before expiry
setInterval(() => {
  const timeUntilExpiry = this.tokenExpiry - Date.now();
  
  // Refresh when 5 minutes remaining
  if (timeUntilExpiry < 5 * 60 * 1000) {
    this.refreshToken();
  }
}, 60000); // Check every minute
```

#### **2. Parallel API Calls**
```javascript
// Bad: Sequential token fetch
const token = await getAccessToken();
const data1 = await fetch('/api/data1', { headers: { Authorization: `Bearer ${token}` } });
const data2 = await fetch('/api/data2', { headers: { Authorization: `Bearer ${token}` } });

// Good: Single token fetch, parallel API calls
const token = await getAccessToken();
const [data1, data2] = await Promise.all([
  fetch('/api/data1', { headers: { Authorization: `Bearer ${token}` } }),
  fetch('/api/data2', { headers: { Authorization: `Bearer ${token}` } })
]);
```

#### **3. Token Caching**
```javascript
// Share token across components without prop drilling
const tokenContext = React.createContext();

function TokenProvider({ children }) {
  const tokenManager = useRef(new TokenManager()).current;
  return <tokenContext.Provider value={tokenManager}>{children}</tokenContext.Provider>;
}

function useAuth() {
  const tokenManager = useContext(tokenContext);
  return {
    getToken: () => tokenManager.getAccessToken(),
    logout: () => tokenManager.logout()
  };
}
```

---

### **I. Scalability Considerations**

#### **1. Multi-Tenant OAuth**
```javascript
// Different OAuth providers per tenant
const oauthConfig = {
  'tenant-a': {
    clientId: 'CLIENT_A',
    authUrl: 'https://tenant-a.auth.com/authorize'
  },
  'tenant-b': {
    clientId: 'CLIENT_B',
    authUrl: 'https://tenant-b.auth.com/authorize'
  }
};

function getTenantConfig(tenantId) {
  return oauthConfig[tenantId];
}
```

#### **2. Token Rotation (High Security)**
```javascript
// Each refresh returns new refresh token
// Old refresh token becomes invalid
// Prevents replay attacks

POST /token
{
  "grant_type": "refresh_token",
  "refresh_token": "OLD_TOKEN"
}

Response:
{
  "access_token": "NEW_ACCESS",
  "refresh_token": "NEW_REFRESH", // Old one revoked
  "expires_in": 3600
}
```

#### **3. Token Revocation**
```javascript
// User clicks "Revoke Access" or logs out
async function revokeToken(token) {
  await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `token=${token}`
  });
}
```

---

### **J. Common Pitfalls & Anti-Patterns**

#### **❌ Storing Client Secret in Frontend**
```javascript
// NEVER DO THIS
const clientSecret = 'super_secret_key'; // Visible in source code!
```

#### **❌ Not Validating State Parameter**
```javascript
// BAD
const code = params.get('code');
exchangeCodeForTokens(code); // CSRF vulnerable

// GOOD
const state = params.get('state');
if (state !== sessionStorage.getItem('oauth_state')) {
  throw new Error('Invalid state');
}
```

#### **❌ Using Implicit Flow**
```javascript
// DEPRECATED
response_type: 'token' // Access token in URL

// USE INSTEAD
response_type: 'code' // Authorization code, exchange for tokens
```

#### **❌ Not Implementing PKCE for SPAs**
```javascript
// BAD (SPA without PKCE)
// Authorization code can be intercepted

// GOOD (SPA with PKCE)
code_challenge: sha256(code_verifier)
// Even if code intercepted, attacker can't use it
```

#### **❌ Storing Tokens in LocalStorage Without XSS Protection**
```javascript
// RISKY
localStorage.setItem('access_token', token);

// BETTER
// 1. Use memory storage
// 2. Implement strict CSP
// 3. Sanitize all user inputs
// 4. Audit third-party scripts
```

#### **❌ Not Handling Token Expiry**
```javascript
// BAD
const token = localStorage.getItem('token');
fetch('/api/data', { headers: { Authorization: `Bearer ${token}` } });
// → 401 if expired

// GOOD
const token = await getValidAccessToken(); // Auto-refreshes if needed
```

---

### **K. What NOT to Do**

1. ❌ **Never expose client_secret in frontend code**
2. ❌ **Never use Implicit Flow** (deprecated)
3. ❌ **Never skip state parameter validation** (CSRF risk)
4. ❌ **Never store tokens in URLs or query params**
5. ❌ **Never trust token expiry without server validation**
6. ❌ **Never log tokens** (`console.log(token)` → screenshot risk)
7. ❌ **Never use wildcards in redirect_uri registration**
8. ❌ **Never skip ID token signature verification**
9. ❌ **Never request more scopes than needed** (privacy violation)
10. ❌ **Never assume OAuth = Authentication** (it's authorization; use OIDC for auth)

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: Google OAuth (Gmail Integration)**

**Scenario:** Email client wants to read user's Gmail

**Flow:**
```javascript
// 1. User clicks "Connect Gmail"
function connectGmail() {
  const params = new URLSearchParams({
    client_id: '123456.apps.googleusercontent.com',
    redirect_uri: 'https://emailapp.com/oauth/callback',
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent screen
    state: generateState()
  });
  
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// 2. User approves, redirected back
// 3. Exchange code for tokens
const tokens = await exchangeCode(code);
// { access_token, refresh_token, expires_in: 3600, scope, token_type: 'Bearer' }

// 4. Fetch emails
const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
  headers: { Authorization: `Bearer ${tokens.access_token}` }
});

// 5. Refresh when expired (1 hour later)
const newTokens = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  body: new URLSearchParams({
    client_id: '123456.apps.googleusercontent.com',
    client_secret: 'SECRET', // Backend only!
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token'
  })
});
```

**Scale:**
- Google processes **billions of OAuth requests daily**
- Token validation latency: <10ms (cached JWKS)
- Token size: ~2KB JWT

---

### **Example 2: GitHub OAuth (CI/CD Platform)**

**Scenario:** CI platform needs access to user's GitHub repos

**Flow:**
```javascript
// 1. Initiate OAuth
https://github.com/login/oauth/authorize?
  client_id=abc123&
  redirect_uri=https://ci-platform.com/auth/github/callback&
  scope=repo,user:email&
  state=xyz

// 2. User approves
// 3. GitHub redirects back with code
// 4. Exchange code for token (backend)

POST https://github.com/login/oauth/access_token
{
  "client_id": "abc123",
  "client_secret": "secret",
  "code": "authorization_code",
  "redirect_uri": "https://ci-platform.com/auth/github/callback"
}

Response:
{
  "access_token": "gho_16C7e42F292c6912E7710c838347Ae178B4a",
  "scope": "repo,user:email",
  "token_type": "bearer"
}

// 5. Use token to access GitHub API
GET https://api.github.com/user/repos
Authorization: Bearer gho_16C7e42F292c6912E7710c838347Ae178B4a
```

**Scale Considerations:**
- GitHub: 100K+ OAuth apps
- Rate limiting: 5,000 requests/hour per token
- Webhook-based token revocation for real-time updates

---

### **Example 3: Slack OAuth (Third-Party Bot)**

**Scenario:** Task management app integrates with Slack

**Flow:**
```javascript
// 1. "Add to Slack" button
<a href="https://slack.com/oauth/v2/authorize?
  client_id=123.456&
  scope=chat:write,channels:read&
  redirect_uri=https://taskapp.com/slack/callback">
  <img src="add_to_slack.png" />
</a>

// 2. User selects workspace, approves
// 3. Slack redirects with code
// 4. Exchange code for bot token

POST https://slack.com/api/oauth.v2.access
{
  "client_id": "123.456",
  "client_secret": "secret",
  "code": "authorization_code",
  "redirect_uri": "https://taskapp.com/slack/callback"
}

Response:
{
  "access_token": "xoxb-123-456-abc", // Bot token
  "team": { "id": "T123", "name": "My Workspace" },
  "authed_user": { "id": "U123" }
}

// 5. Post messages to Slack
POST https://slack.com/api/chat.postMessage
Authorization: Bearer xoxb-123-456-abc
{
  "channel": "C123",
  "text": "Task assigned to you!"
}
```

**Multi-Tenant Consideration:**
- One bot token per Slack workspace
- Store mapping: `workspace_id → bot_token`
- Handle token revocation (user uninstalls app)

---

### **Example 4: Netflix-Style SSO (Enterprise)**

**Scenario:** Corporate dashboard with SSO

**Flow:**
```javascript
// 1. User clicks "Sign in with Company SSO"
// 2. Redirect to company's identity provider (Okta, Azure AD)

https://company.okta.com/oauth2/v1/authorize?
  client_id=dashboard_app&
  response_type=code&
  scope=openid profile email groups&
  redirect_uri=https://dashboard.company.com/callback&
  state=abc123

// 3. User authenticates (if not already)
// 4. Okta redirects back with code
// 5. Exchange code for tokens

{
  "access_token": "...",
  "id_token": "eyJhbGc...", // Contains user claims
  "refresh_token": "...",
  "expires_in": 3600
}

// 6. Decode ID token
{
  "sub": "user@company.com",
  "name": "John Doe",
  "email": "john@company.com",
  "groups": ["engineering", "managers"],
  "iss": "https://company.okta.com",
  "aud": "dashboard_app",
  "exp": 1234567890
}

// 7. Use groups for authorization
if (idToken.groups.includes('managers')) {
  showAdminPanel();
}
```

**Scale:**
- 10K+ employees, single OAuth provider
- Token caching: Redis (TTL = token expiry)
- Revocation via webhook (employee leaves)

---

### **Example 5: Stripe Connect (Marketplace OAuth)**

**Scenario:** Marketplace platform managing payments for vendors

**Flow:**
```javascript
// 1. Vendor clicks "Connect Stripe"
https://connect.stripe.com/oauth/authorize?
  response_type=code&
  client_id=ca_123&
  scope=read_write&
  redirect_uri=https://marketplace.com/connect/stripe

// 2. Vendor authorizes
// 3. Stripe redirects with code
// 4. Exchange code for account credentials

POST https://connect.stripe.com/oauth/token
{
  "client_secret": "sk_live_...",
  "code": "ac_...",
  "grant_type": "authorization_code"
}

Response:
{
  "access_token": "sk_test_...",
  "livemode": false,
  "refresh_token": "rt_...",
  "token_type": "bearer",
  "stripe_publishable_key": "pk_test_...",
  "stripe_user_id": "acct_123",
  "scope": "read_write"
}

// 5. Create charges on behalf of vendor
const charge = await stripe.charges.create(
  { amount: 1000, currency: 'usd', source: 'tok_visa' },
  { stripeAccount: 'acct_123' } // Vendor's connected account
);
```

**Scale:**
- Millions of connected accounts
- Token encryption at rest
- Webhook-based re-authorization (if scope changes)

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Interview Answer (7+ Years Level)**

> *"OAuth 2.0 is a delegation protocol that allows users to grant third-party apps access to their resources without sharing passwords. From a frontend perspective, I'd focus on the Authorization Code Flow with PKCE, which is the recommended approach for SPAs."*
>
> *"The flow works like this: The user clicks 'Login with Google,' we redirect them to Google's authorization server with our client_id, requested scopes, and a PKCE code challenge. The user authenticates and approves the scopes. Google redirects back to our callback URL with an authorization code. We then exchange that code along with our PKCE code verifier for access and refresh tokens."*
>
> *"PKCE is critical here because SPAs can't securely store a client_secret. The code challenge ensures that even if an attacker intercepts the authorization code, they can't exchange it for tokens without the code verifier, which only our frontend knows."*
>
> *"For token storage, I'd keep the short-lived access token in memory and store the refresh token in an HttpOnly cookie. This protects against XSS—if our app is compromised via XSS, the attacker can't steal the refresh token. We'd implement token refresh proactively, fetching a new access token before the current one expires."*
>
> *"At scale, we'd consider token size impact on bandwidth, implement token revocation via webhooks, and use Redis for caching validation keys. For multi-tenant scenarios, we'd support different OAuth providers per tenant with a configuration mapping."*
>
> *"Security-wise, the state parameter prevents CSRF attacks, we'd validate the ID token signature using the provider's JWKS, and we'd request minimal scopes following the principle of least privilege. We'd also implement proper error handling for edge cases like user denial, network failures, and token expiration."*

---

### **Likely Follow-Up Questions**

#### **Q1: "Why not use Implicit Flow? It's simpler."**
**A:** *"Implicit Flow is deprecated by OAuth 2.0 Security Best Practices because it exposes access tokens directly in the URL. This means tokens appear in browser history, server logs, and can leak via referer headers. It also doesn't support refresh tokens, forcing more frequent re-authentication. Authorization Code Flow with PKCE provides the same simplicity for public clients but with much better security—the authorization code is single-use and short-lived, and tokens are only returned via a server response, never in the URL."*

---

#### **Q2: "How do you handle token expiry across multiple tabs?"**
**A:** *"There are a few approaches. If using LocalStorage for the access token, the `storage` event fires across tabs when the token is updated, allowing synchronized refresh. However, this doesn't work with memory storage."*

*"My preferred approach is to use a SharedWorker or BroadcastChannel API for cross-tab communication. When one tab refreshes the token, it broadcasts the new token to other tabs. Alternatively, we can use the refresh token in an HttpOnly cookie—each tab independently refreshes when needed, and since the refresh token is shared, all tabs stay in sync."*

*"For high-security apps, we might deliberately not share tokens across tabs (SessionStorage), forcing re-authentication per tab to limit the blast radius of a compromise."*

---

#### **Q3: "What happens if the user revokes access while using the app?"**
**A:** *"When a user revokes access via the OAuth provider's dashboard, our access tokens remain valid until they expire—OAuth tokens are bearer tokens, and the resource server doesn't check revocation on every request for performance reasons."*

*"To handle this, we need webhook support from the provider. For example, Google sends a webhook when access is revoked. Our backend receives this, invalidates cached tokens, and optionally pushes a logout event to connected clients via WebSocket or Server-Sent Events."*

*"When the user's next API call fails with a 401, our frontend should attempt a token refresh. If that also fails with an invalid_grant error, we know the refresh token was revoked, and we force a logout and redirect to the login page."*

---

#### **Q4: "How would you implement social login with multiple providers (Google, GitHub, Facebook)?"**
**A:** *"I'd create a unified authentication service that abstracts provider-specific OAuth flows. Each provider has slightly different endpoints and parameter names, but the flow is similar."*

```javascript
const oauthProviders = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    clientId: 'GOOGLE_CLIENT_ID'
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'user:email',
    clientId: 'GITHUB_CLIENT_ID'
  }
  // ... other providers
};

function initiateOAuth(provider) {
  const config = oauthProviders[provider];
  // Generate state, PKCE, build URL, redirect
}
```

*"On the backend, I'd normalize the user data from different providers into a consistent format. For example, Google returns 'sub' for user ID, GitHub returns 'id'—we'd map these to a common 'userId' field."*

*"We'd also handle account linking—if a user logs in with Google first, then later with GitHub using the same email, we'd merge the accounts rather than creating duplicates. This requires email verification to prevent account takeover."*

---

#### **Q5: "What are the performance implications of OAuth at scale?"**
**A:** *"Several factors impact performance at scale:"*

*"1. **Token Size**: JWTs can be 1-2KB. With 10M requests/day, that's 20GB of overhead. We can mitigate by using opaque tokens on the wire and doing local validation, or by minimizing JWT claims."*

*"2. **Token Validation**: Validating JWT signatures requires fetching the provider's public keys (JWKS). We cache these keys with a TTL matching their rotation period. Google's JWKS endpoint returns cache-control headers—we respect those to avoid repeated fetches."*

*"3. **Redirect Latency**: Full page redirects to the authorization server add 2-3 seconds to login flow. For critical paths, we can use popup-based OAuth to avoid page reload, though this has UX trade-offs with popup blockers."*

*"4. **Token Refresh**: Without proper deduplication, multiple components might trigger simultaneous refresh calls. We use a singleton token manager with a refresh promise to ensure only one refresh happens at a time."*

*"5. **Database Lookups**: If we store user sessions linked to OAuth tokens, each request might query the database. We cache these sessions in Redis with TTL matching token expiry to reduce database load."*

---

#### **Q6: "How do you test OAuth flows in development?"**
**A:** *"Testing OAuth is tricky because it involves third-party services. Here's my approach:"*

*"1. **Mock Authorization Server**: For unit tests, I mock the OAuth endpoints entirely. The mock returns test tokens immediately without actual authentication."*

*"2. **OAuth Playground**: Providers like Google offer OAuth playgrounds where you can test the flow interactively and see the exact requests/responses."*

*"3. **Local Tunneling**: For local development, OAuth requires a registered redirect_uri. I use ngrok or similar to expose localhost, then register `https://abc123.ngrok.io/callback` as a redirect URI."*

*"4. **Test Accounts**: Create dedicated test accounts with the OAuth provider to avoid polluting production data."*

*"5. **Replay Testing**: Record real OAuth responses and replay them in tests. Libraries like nock (Node.js) or MSW (browser) can intercept HTTP requests."*

*"6. **E2E Tests**: Use Cypress or Playwright to automate the full flow. We pre-authenticate in the test setup to avoid triggering actual OAuth in CI, or use provider-specific test modes (some providers offer sandbox environments)."*

---

### **Comparison: OAuth Flows**

| Flow | Use Case | Security | Frontend Complexity | Tokens in URL |
|------|----------|----------|---------------------|---------------|
| **Authorization Code + PKCE** | SPAs, Mobile Apps | ✅ High | Medium | ❌ No |
| **Authorization Code** | Server-side Web Apps | ✅ High | Low | ❌ No |
| **Implicit** (deprecated) | Legacy SPAs | ❌ Low | Low | ✅ Yes (risky) |
| **Client Credentials** | Machine-to-Machine | ✅ High | N/A (backend) | ❌ No |
| **Password Grant** (avoid) | First-party only | ⚠️ Medium | Low | ❌ No |

---

### **Verbal Guidance for Interviews**

- **Start with the flow**: "Let me walk through Authorization Code Flow with PKCE..."
- **Emphasize security**: "The state parameter prevents CSRF, PKCE prevents code interception..."
- **Mention real providers**: "Google recommends...", "GitHub's OAuth..."
- **Discuss scale**: "At 10M users, token size matters..."
- **Acknowledge trade-offs**: "Redirect provides best security but worse UX than popup..."
- **Show depth**: Mention JWKS caching, token rotation, webhook-based revocation
- **Prepare for pushback**: If interviewer says "Why not LocalStorage?", explain XSS risks

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

### **Complete Production-Ready OAuth Implementation**

```javascript
// ========================================
// oauthService.js - OAuth Service
// ========================================

class OAuthService {
  constructor(config) {
    this.config = config; // { clientId, redirectUri, authUrl, tokenUrl, scope }
    this.accessToken = null;
    this.tokenExpiry = null;
    this.refreshPromise = null;
  }

  // ========================================
  // 1. Initiate OAuth Flow with PKCE
  // ========================================
  async initiateLogin() {
    const state = this.generateRandomString(32);
    const { verifier, challenge } = await this.generatePKCE();

    // Store for validation later
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('pkce_verifier', verifier);

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scope,
      state: state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      // Optional: prompt=consent to force consent screen
      // Optional: access_type=offline for refresh token (Google)
    });

    const authUrl = `${this.config.authUrl}?${params}`;
    window.location.href = authUrl;
  }

  // ========================================
  // 2. Handle OAuth Callback
  // ========================================
  async handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    // Check for errors
    if (error) {
      const errorDescription = params.get('error_description');
      throw new Error(`OAuth error: ${error} - ${errorDescription}`);
    }

    // Validate state (CSRF protection)
    const savedState = sessionStorage.getItem('oauth_state');
    if (!state || state !== savedState) {
      throw new Error('State mismatch - possible CSRF attack');
    }

    // Get PKCE verifier
    const codeVerifier = sessionStorage.getItem('pkce_verifier');
    if (!codeVerifier) {
      throw new Error('Missing PKCE verifier');
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code, codeVerifier);

    // Clean up
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('pkce_verifier');

    // Store tokens
    this.accessToken = tokens.access_token;
    this.tokenExpiry = Date.now() + tokens.expires_in * 1000;

    // Store refresh token in HttpOnly cookie via backend
    if (tokens.refresh_token) {
      await this.storeRefreshToken(tokens.refresh_token);
    }

    // Validate and decode ID token if present (OpenID Connect)
    if (tokens.id_token) {
      const userInfo = await this.validateIdToken(tokens.id_token);
      return { tokens, userInfo };
    }

    return { tokens };
  }

  // ========================================
  // 3. Exchange Authorization Code for Tokens
  // ========================================
  async exchangeCodeForTokens(code, codeVerifier) {
    // For SPAs with PKCE, this can be done client-side
    // For traditional apps, do this server-side with client_secret
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        code: code,
        code_verifier: codeVerifier, // PKCE
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description}`);
    }

    return await response.json();
    // Returns: { access_token, refresh_token, id_token, expires_in, token_type }
  }

  // ========================================
  // 4. Get Valid Access Token (with auto-refresh)
  // ========================================
  async getAccessToken() {
    // If token exists and valid (with 1 min buffer)
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

  // ========================================
  // 5. Refresh Access Token
  // ========================================
  async refreshAccessToken() {
    try {
      // Call backend endpoint that has refresh token in HttpOnly cookie
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Send HttpOnly cookie
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const { access_token, expires_in } = await response.json();

      this.accessToken = access_token;
      this.tokenExpiry = Date.now() + expires_in * 1000;

      return access_token;
    } catch (error) {
      // Refresh failed - user needs to re-login
      this.logout();
      throw error;
    }
  }

  // ========================================
  // 6. Logout
  // ========================================
  async logout() {
    // Clear tokens
    this.accessToken = null;
    this.tokenExpiry = null;

    // Revoke tokens server-side
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      // Optional: Revoke with OAuth provider
      if (this.config.revokeUrl) {
        await fetch(this.config.revokeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `token=${this.accessToken}`,
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Redirect to login
    window.location.href = '/login';
  }

  // ========================================
  // PKCE Helper Functions
  // ========================================
  generateRandomString(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  base64URLEncode(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  async sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return await crypto.subtle.digest('SHA-256', data);
  }

  async generatePKCE() {
    const verifier = this.generateRandomString(128);
    const challengeBuffer = await this.sha256(verifier);
    const challenge = this.base64URLEncode(challengeBuffer);
    return { verifier, challenge };
  }

  // ========================================
  // ID Token Validation (OpenID Connect)
  // ========================================
  async validateIdToken(idToken) {
    // Use a library like 'jose' for production
    // This is a simplified example

    const [headerB64, payloadB64, signatureB64] = idToken.split('.');

    // Decode payload
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

    // 1. Verify issuer
    if (payload.iss !== this.config.expectedIssuer) {
      throw new Error('Invalid issuer');
    }

    // 2. Verify audience
    if (payload.aud !== this.config.clientId) {
      throw new Error('Invalid audience');
    }

    // 3. Verify expiry
    if (payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    // 4. Verify issued at
    const now = Date.now() / 1000;
    if (payload.iat > now + 300 || payload.iat < now - 3600) {
      throw new Error('Invalid iat');
    }

    // 5. Verify signature (fetch JWKS and validate)
    // await this.verifySignature(idToken);

    return payload; // { sub, email, name, picture, ... }
  }

  // ========================================
  // Store Refresh Token via Backend
  // ========================================
  async storeRefreshToken(refreshToken) {
    await fetch('/api/auth/store-refresh-token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }
}

// ========================================
// apiClient.js - API Client with OAuth
// ========================================

import axios from 'axios';

class APIClient {
  constructor(oauthService) {
    this.oauthService = oauthService;
    this.client = axios.create({
      baseURL: '/api',
    });

    // Request interceptor: Inject token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.oauthService.getAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: Handle 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const token = await this.oauthService.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.oauthService.logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  get(url, config) {
    return this.client.get(url, config);
  }

  post(url, data, config) {
    return this.client.post(url, data, config);
  }

  // ... other methods
}

// ========================================
// app.js - Usage Example
// ========================================

// Initialize OAuth service
const oauthService = new OAuthService({
  clientId: 'YOUR_CLIENT_ID',
  redirectUri: 'https://yourapp.com/oauth/callback',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  revokeUrl: 'https://oauth2.googleapis.com/revoke',
  scope: 'openid email profile',
  expectedIssuer: 'https://accounts.google.com',
});

// Initialize API client
const apiClient = new APIClient(oauthService);

// Login button
document.getElementById('login-btn').addEventListener('click', () => {
  oauthService.initiateLogin();
});

// Handle callback page
if (window.location.pathname === '/oauth/callback') {
  oauthService
    .handleCallback()
    .then(({ userInfo }) => {
      console.log('Logged in as:', userInfo);
      window.location.href = '/dashboard';
    })
    .catch((error) => {
      console.error('Login failed:', error);
      window.location.href = '/login?error=' + error.message;
    });
}

// Logout button
document.getElementById('logout-btn').addEventListener('click', () => {
  oauthService.logout();
});

// Example API call
async function fetchUserData() {
  try {
    const response = await apiClient.get('/user/profile');
    console.log('User data:', response.data);
  } catch (error) {
    console.error('Failed to fetch user data:', error);
  }
}
```

---

### **Backend Example (Node.js/Express)**

```javascript
// ========================================
// server.js - Backend OAuth Endpoints
// ========================================

const express = require('express');
const cookieParser = require('cookie-parser');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cookieParser());

// ========================================
// Store Refresh Token (HttpOnly Cookie)
// ========================================
app.post('/api/auth/store-refresh-token', (req, res) => {
  const { refresh_token } = req.body;

  // Store in HttpOnly cookie
  res.cookie('refresh_token', refresh_token, {
    httpOnly: true, // JavaScript can't access
    secure: true, // HTTPS only
    sameSite: 'strict', // CSRF protection
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/api/auth', // Only sent to auth endpoints
  });

  res.json({ success: true });
});

// ========================================
// Refresh Access Token
// ========================================
app.post('/api/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    // Exchange refresh token for new access token
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET, // Backend only!
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const { access_token, expires_in, refresh_token: newRefreshToken } = response.data;

    // If provider rotates refresh tokens, update cookie
    if (newRefreshToken) {
      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
      });
    }

    res.json({ access_token, expires_in });
  } catch (error) {
    console.error('Token refresh failed:', error);
    res.status(401).json({ error: 'Refresh failed' });
  }
});

// ========================================
// Logout (Clear Cookies, Revoke Token)
// ========================================
app.post('/api/auth/logout', async (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  // Revoke token with OAuth provider
  if (refreshToken) {
    try {
      await axios.post(
        'https://oauth2.googleapis.com/revoke',
        `token=${refreshToken}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    } catch (error) {
      console.error('Token revocation failed:', error);
    }
  }

  // Clear cookie
  res.clearCookie('refresh_token', { path: '/api/auth' });
  res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

### **React Integration Example**

```javascript
// ========================================
// AuthContext.js - React Context
// ========================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { oauthService } from './oauthService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const initAuth = async () => {
      try {
        const token = await oauthService.getAccessToken();
        if (token) {
          // Fetch user info
          const response = await fetch('/api/user/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = () => {
    oauthService.initiateLogin();
  };

  const logout = () => {
    oauthService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// ========================================
// LoginButton.js
// ========================================

import React from 'react';
import { useAuth } from './AuthContext';

function LoginButton() {
  const { user, loading, login, logout } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (user) {
    return (
      <div>
        <img src={user.picture} alt={user.name} />
        <span>Welcome, {user.name}</span>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return <button onClick={login}>Login with Google</button>;
}

export default LoginButton;

// ========================================
// OAuthCallback.js
// ========================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { oauthService } from './oauthService';

function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    oauthService
      .handleCallback()
      .then(() => {
        navigate('/dashboard');
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [navigate]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div>Processing login...</div>;
}

export default OAuthCallback;
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters**

1. **Security**: Prevents password sharing, reduces credential theft
2. **User Experience**: One-click social login, no account creation friction
3. **Business**: 3x higher conversion rates with social login vs traditional signup
4. **Compliance**: GDPR-compliant delegation of data access
5. **Ecosystem**: Enables third-party integrations (Slack apps, GitHub Actions)
6. **Scale**: Stateless tokens reduce server load (no session store lookups)

**Real Impact:**
- **Dropbox**: 70% of signups via social login
- **Spotify**: 100K+ third-party apps via OAuth
- **GitHub**: OAuth powers entire CI/CD ecosystem

### **How It Works (Technical Summary)**

```
┌─────────────────────────────────────────────────────────────┐
│ OAUTH 2.0 AUTHORIZATION CODE FLOW WITH PKCE                │
└─────────────────────────────────────────────────────────────┘

1. USER ACTION
   User clicks "Login with Provider"

2. FRONTEND PREPARATION
   - Generate code_verifier (random 128-char string)
   - Derive code_challenge = SHA256(code_verifier)
   - Generate state (random string for CSRF protection)
   - Store state & code_verifier in sessionStorage

3. REDIRECT TO AUTHORIZATION SERVER
   https://provider.com/authorize?
     client_id=abc123
     &redirect_uri=https://yourapp.com/callback
     &response_type=code
     &scope=email profile
     &state=xyz
     &code_challenge=sha256_hash
     &code_challenge_method=S256

4. USER AUTHENTICATES & APPROVES
   - Provider shows login page (if not logged in)
   - Provider shows consent screen (requested scopes)
   - User approves

5. PROVIDER REDIRECTS BACK
   https://yourapp.com/callback?
     code=AUTHORIZATION_CODE
     &state=xyz

6. FRONTEND VALIDATION
   - Verify state matches stored value (CSRF check)
   - Extract authorization code

7. EXCHANGE CODE FOR TOKENS
   POST https://provider.com/token
   {
     client_id: "abc123",
     code: "AUTHORIZATION_CODE",
     code_verifier: "original_verifier", // PKCE proof
     redirect_uri: "https://yourapp.com/callback",
     grant_type: "authorization_code"
   }

8. PROVIDER VALIDATES & RETURNS TOKENS
   - Validates code is valid & not expired
   - Validates code_verifier: SHA256(verifier) == stored challenge
   - Returns:
     {
       access_token: "eyJhbG...", // 15-60 min
       refresh_token: "opaque_string", // 30 days
       id_token: "eyJhbG...", // User identity (OIDC)
       expires_in: 3600,
       token_type: "Bearer"
     }

9. FRONTEND STORES TOKENS
   - Access token → Memory (JavaScript variable)
   - Refresh token → HttpOnly Cookie (via backend)
   - ID token → Decode & display user info

10. API REQUESTS
    GET /api/data
    Authorization: Bearer <access_token>

11. TOKEN REFRESH (when access token expires)
    POST /api/auth/refresh
    (Refresh token sent automatically via HttpOnly cookie)
    → Returns new access_token
    → Store in memory
    → Continue API calls seamlessly

12. LOGOUT
    - Clear memory token
    - Call backend /logout to clear HttpOnly cookie
    - Optionally revoke tokens with provider
```

**Key Security Principles:**
- **Authorization code is single-use**: Can't replay
- **PKCE prevents interception**: Code useless without verifier
- **State prevents CSRF**: Attacker can't trick victim into using attacker's code
- **Short-lived access tokens**: Limited exposure window
- **Long-lived refresh tokens in HttpOnly cookies**: XSS can't steal them
- **Scope-based access**: Granular permissions

────────────────────────────────────

This comprehensive guide covers OAuth at a FAANG senior/staff level. Would you like me to expand on any specific section, such as OpenID Connect, multi-provider integration, or webhook-based token revocation?
