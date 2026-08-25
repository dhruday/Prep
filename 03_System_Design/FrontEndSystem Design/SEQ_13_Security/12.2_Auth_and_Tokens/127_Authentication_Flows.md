# 127. Authentication Flows

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
Authentication flows are the sequences of interactions between client, server, and sometimes third-party services that verify a user's identity. They determine how users log in, maintain sessions, and access protected resources in web applications.

**Why it exists:**
Different authentication mechanisms exist because applications have different security requirements, user experiences, and architectural patterns. A banking app needs different auth than a blog comment system. Modern distributed systems (SPAs, mobile apps, microservices) require more sophisticated flows than traditional server-rendered applications.

**When and where it's used:**
- **Session-based:** Traditional server-rendered apps, high-security applications
- **Token-based (JWT):** SPAs, mobile apps, microservices APIs
- **OAuth 2.0:** Third-party login (Google, GitHub), API access delegation
- **SSO (Single Sign-On):** Enterprise applications, multiple related services
- **Passwordless:** Magic links, WebAuthn/FIDO2 for modern UX

**Role in large-scale applications:**
In enterprise systems, authentication enables:
- Secure access control across distributed services
- Seamless user experience across multiple apps (SSO)
- API access for third-party integrations
- Compliance with security regulations (SOC2, GDPR)
- Scalable session management for millions of concurrent users

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **Authentication vs Authorization:**

```
Authentication: "Who are you?"
- Verifying identity (username/password, biometrics, etc.)
- Establishing a session or issuing tokens

Authorization: "What can you do?"
- Checking permissions/roles after authentication
- Access control to specific resources

Frontend Engineer Must Understand Both!
```

### **1. Session-Based Authentication (Traditional)**

**How it works:**
```
1. User submits credentials
   POST /login { username, password }
   ↓
2. Server validates credentials
   ↓
3. Server creates session
   - Generates session ID
   - Stores session data in memory/Redis/database
   - sessionId → { userId, roles, exp}
   ↓
4. Server sends session ID in cookie
   Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Lax
   ↓
5. Browser automatically sends cookie with subsequent requests
   GET /api/profile
   Cookie: sessionId=abc123
   ↓
6. Server looks up session, validates, returns data
```

**Storage Locations:**
```javascript
// In-Memory (single server, not scalable)
const sessions = new Map();
sessions.set('abc123', { userId: 1, exp: Date.now() + 3600000 });

// Redis (scalable, fast)
await redis.set('session:abc123', JSON.stringify({
  userId: 1,
  roles: ['user'],
  exp: Date.now() + 3600000
}), 'EX', 3600);

// Database (persistent, slower)
await db.sessions.insert({
  id: 'abc123',
  userId: 1,
  expiresAt: new Date(Date.now() + 3600000)
});
```

**Pros:**
- Server has complete control (can revoke instantly)
- Simpler to invalidate (just delete session)
- Stateful (server knows who's logged in)
- Works with server-side rendering

**Cons:**
- Requires server-side storage (memory/Redis)
- Doesn't scale horizontally without shared session store
- CORS complications with cookies
- Not ideal for mobile apps or microservices

---

### **2. Token-Based Authentication (JWT)**

**How it works:**
```
1. User submits credentials
   POST /login { username, password }
   ↓
2. Server validates credentials
   ↓
3. Server creates JWT
   const token = jwt.sign(
     { userId: 1, roles: ['user'] },  // Payload
     SECRET_KEY,                       // Secret
     { expiresIn: '1h' }              // Options
   );
   ↓
4. Server sends token in response
   { accessToken: 'eyJhbGc...' }
   ↓
5. Client stores token (localStorage, memory, cookie)
   ↓
6. Client sends token with every request
   Authorization: Bearer eyJhbGc...
   ↓
7. Server verifies signature and extracts payload
   const decoded = jwt.verify(token, SECRET_KEY);
```

**JWT Structure:**
```
eyJhbGc...  .  eyJ1c2Vy...  .  SflKxw...
   HEADER     .    PAYLOAD    .  SIGNATURE

Header: { alg: 'HS256', typ: 'JWT' }
Payload: { userId: 1, roles: ['user'], exp: 1234567890 }
Signature: HMACSHA256(base64(header) + '.' + base64(payload), SECRET)
```

**Pros:**
- Stateless (no server storage required)
- Scales horizontally (any server can verify)
- Works with SPAs, mobile apps, microservices
- Contains user info (no database lookup needed)

**Cons:**
- Can't revoke before expiry (unless maintain blacklist)
- Larger than session ID (sent with every request)
- Vulnerable if stolen (valid until expiry)
- Payload is readable (don't store sensitive data)

---

### **3. Refresh Token Pattern**

**Problem with short-lived JWTs:**
- Short expiry (15 min) = better security
- But forces users to re-login frequently = bad UX

**Solution: Access Token + Refresh Token**

**Flow:**
```
1. Login → Server returns:
   {
     accessToken: 'eyJ...',  // Short-lived (15 min)
     refreshToken: 'refresh_eyJ...'  // Long-lived (7 days)
   }
   ↓
2. Client uses accessToken for API requests
   Authorization: Bearer eyJ...
   ↓
3. When accessToken expires (15 min later):
   Client sends refreshToken to /refresh endpoint
   ↓
4. Server validates refreshToken
   - Check signature
   - Check not revoked (database/Redis lookup)
   - Check user still active
   ↓
5. Server issues new accessToken (and optionally new refreshToken)
   { accessToken: 'eyJ_new...' }
   ↓
6. Client retries original request with new token
```

**Storage Strategy:**
```javascript
// Access Token: Memory (most secure, lost on refresh)
let accessToken = null;

// Refresh Token: HttpOnly cookie (secure, persistent)
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/refresh

// Why this combo?
// - Access token in memory: XSS can't steal it
// - Refresh token in HttpOnly cookie: XSS can't read it
// - Refresh token path restricted: Only sent to /refresh endpoint
```

**Revocation Strategy:**
```javascript
// Store refresh tokens in database
await db.refreshTokens.insert({
  token: hashedRefreshToken,
  userId: 1,
  expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
  deviceInfo: req.get('User-Agent')
});

// Revoke on logout
await db.refreshTokens.delete({ token: hashedRefreshToken });

// Revoke all devices
await db.refreshTokens.delete({ userId: 1 });

// Revoke specific device
await db.refreshTokens.delete({ userId: 1, deviceInfo: '...' });
```

---

### **4. OAuth 2.0 Flow (Authorization Code)**

**Use Case:** "Login with Google" or allowing third-party apps access

**Flow:**
```
1. User clicks "Login with Google"
   ↓
2. Your app redirects to Google
   GET https://accounts.google.com/oauth/authorize?
     client_id=YOUR_CLIENT_ID&
     redirect_uri=https://yourapp.com/callback&
     response_type=code&
     scope=openid email profile
   ↓
3. User logs into Google and consents
   ↓
4. Google redirects back with authorization code
   https://yourapp.com/callback?code=AUTH_CODE
   ↓
5. Your backend exchanges code for tokens
   POST https://oauth2.googleapis.com/token
   {
     code: AUTH_CODE,
     client_id: YOUR_CLIENT_ID,
     client_secret: YOUR_CLIENT_SECRET,
     redirect_uri: https://yourapp.com/callback,
     grant_type: 'authorization_code'
   }
   ↓
6. Google returns tokens
   {
     access_token: 'ya29...',  // Access Google APIs
     id_token: 'eyJ...',        // JWT with user info
     refresh_token: 'refresh...'
   }
   ↓
7. Your backend verifies id_token and creates session/JWT
   ↓
8. User is logged into your app
```

**Why Authorization Code (not Implicit Flow)?**
```
Authorization Code Flow (Recommended):
- Code exchanged on backend (client_secret never exposed)
- More secure (PKCE extension for SPAs)
- Refresh token supported

Implicit Flow (Deprecated):
- Tokens in URL fragment (#access_token=...)
- Visible in browser history, logs
- No refresh token
- Not recommended for modern apps
```

---

### **5. SSO (Single Sign-On)**

**Use Case:** User logs in once, accesses multiple related apps

**Protocols:**
- **SAML** (older, enterprise, XML-based)
- **OAuth 2.0 / OpenID Connect** (modern, JSON-based)

**Flow (OIDC):**
```
User visits App A (e.g., company wiki)
  ↓
Redirects to SSO provider (e.g., Okta)
  ↓
SSO provider checks if user has active session
  YES → Returns tokens immediately
  NO → Shows login page
  ↓
User authenticates once
  ↓
SSO provider creates session (cookie on sso.company.com)
  ↓
App A receives tokens, creates local session
  ↓
User visits App B (e.g., company email)
  ↓
Redirects to SSO provider
  ↓
SSO provider sees existing session → No login needed!
  ↓
App B receives tokens, user is logged in

One login → Access to all apps
```

---

### **6. Passwordless Authentication**

**Magic Link:**
```
1. User enters email
   ↓
2. Server generates one-time token
   const token = crypto.randomBytes(32).toString('hex');
   await redis.set(`magic:${token}`, userId, 'EX', 600); // 10 min
   ↓
3. Send email with link
   https://app.com/auth/verify?token=abc123
   ↓
4. User clicks link
   ↓
5. Server validates token, creates session
```

**WebAuthn / FIDO2 (Biometric, Security Keys):**
```
Registration:
1. User provides username
   ↓
2. Browser prompts for biometric/security key
   ↓
3. Device generates public/private key pair
   ↓
4. Public key sent to server and stored
   ↓
5. Private key stays on device (never leaves!)

Authentication:
1. User enters username
   ↓
2. Server sends challenge (random data)
   ↓
3. Device signs challenge with private key
   ↓
4. Server verifies signature with stored public key
   ↓
5. User authenticated (no password ever sent!)
```

---

### **Performance & Scalability:**

**Session-Based:**
```
Lookup Time:
- Memory: ~0.01ms (single server only)
- Redis: 1-5ms (network round-trip)
- Database: 10-50ms (too slow for every request)

At Scale (1M concurrent users):
- Memory: 1M * 1KB = 1GB RAM per server (not scalable)
- Redis Cluster: Distributed, fast, scalable
```

**Token-Based:**
```
Verification Time:
- JWT signature verification: ~0.1ms (no network/storage)
- No database lookup needed (user info in payload)

At Scale:
- Stateless → Any server can handle any request
- Horizontal scaling trivial
- But larger request size (~200 bytes per request)
```

**Trade-offs:**

| Aspect | Session | JWT | Refresh Token |
|--------|---------|-----|---------------|
| **Scalability** | Needs shared store | Perfect | Hybrid (stateless + revocable) |
| **Security** | Revoke instantly | Can't revoke | Best of both |
| **Performance** | 1-5ms (Redis) | 0.1ms (no network) | 0.1ms + revocation checks |
| **Complexity** | Simple | Simple | Complex |
| **Mobile/SPA** | Cookie issues | Perfect | Perfect |

---

### **Common Pitfalls:**

❌ **Storing JWT in localStorage:**
```javascript
// VULNERABLE to XSS
localStorage.setItem('token', jwt);
// If attacker injects script, they steal token

// BETTER: Memory (lost on refresh)
let token = null;

// BEST: HttpOnly cookie (backend sets it)
Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict
```

❌ **No token expiration:**
```javascript
// VULNERABLE: Token valid forever
const token = jwt.sign({ userId: 1 }, SECRET);

// SECURE: Short expiry
const token = jwt.sign({ userId: 1 }, SECRET, { expiresIn: '15m' });
```

❌ **Not validating JWT signature:**
```javascript
// VULNERABLE: Attacker can forge tokens
const decoded = jwt.decode(token); // No verification!

// SECURE: Verify signature
const decoded = jwt.verify(token, SECRET);
```

❌ **Sensitive data in JWT payload:**
```javascript
// VULNERABLE: JWT is base64-encoded, not encrypted!
const token = jwt.sign({
  userId: 1,
  password: 'secret123',  // DON'T!
  creditCard: '1234...'   // DON'T!
}, SECRET);

// SECURE: Only non-sensitive data
const token = jwt.sign({
  userId: 1,
  roles: ['user'],
  email: 'user@example.com' // OK if public
}, SECRET);
```

❌ **Not handling token refresh:**
```javascript
// BAD UX: User kicked out when token expires
if (response.status === 401) {
  redirectToLogin();
}

// GOOD UX: Auto-refresh silently
if (response.status === 401) {
  const newToken = await refreshAccessToken();
  retryRequestWithNewToken(newToken);
}
```

---

### **What NOT to Do:**

1. **Never store passwords in plain text** - Always hash (bcrypt, argon2)
2. **Never trust client-side auth checks** - Always validate on backend
3. **Never use weak secrets for JWT** - Use at least 256-bit random key
4. **Never implement your own crypto** - Use battle-tested libraries
5. **Never skip HTTPS** - All auth must be over TLS

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: Netflix-Style Auth (JWT + Refresh)**

**Requirements:**
- Multiple devices (TV, phone, browser)
- Long sessions (remember me)
- Revokable per-device
- Seamless token refresh

**Implementation:**
```javascript
// ============================================
// Backend - Login
// ============================================
app.post('/api/auth/login', async (req, res) => {
  const { email, password, rememberMe } = req.body;
  
  // Validate credentials
  const user = await db.users.findOne({ email });
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Create access token (short-lived)
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      roles: user.roles
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );
  
  // Create refresh token (long-lived)
  const refreshToken = jwt.sign(
    { userId: user.id, tokenFamily: uuidv4() },
    REFRESH_TOKEN_SECRET,
    { expiresIn: rememberMe ? '30d' : '7d' }
  );
  
  // Store refresh token in database
  await db.refreshTokens.insert({
    tokenHash: await bcrypt.hash(refreshToken, 10),
    userId: user.id,
    deviceInfo: req.get('User-Agent'),
    ipAddress: req.ip,
    expiresAt: new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 3600 * 1000)
  });
  
  // Set refresh token as HttpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: (rememberMe ? 30 : 7) * 24 * 3600 * 1000,
    path: '/api/auth/refresh'  // Only sent to refresh endpoint
  });
  
  res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
});

// ============================================
// Backend - Refresh Token
// ============================================
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.cookies;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }
  
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    
    // Check if token exists in database (not revoked)
    const storedTokens = await db.refreshTokens.find({ userId: decoded.userId });
    const tokenExists = await Promise.any(
      storedTokens.map(t => bcrypt.compare(refreshToken, t.tokenHash))
    );
    
    if (!tokenExists) {
      // Token reuse detected! Possible theft, revoke all tokens
      await db.refreshTokens.delete({ userId: decoded.userId });
      return res.status(401).json({ error: 'Token reuse detected' });
    }
    
    // Issue new access token
    const user = await db.users.findById(decoded.userId);
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roles: user.roles
      },
      ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );
    
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ============================================
// Frontend - API Client with Auto-Refresh
// ============================================
class AuthenticatedAPIClient {
  constructor() {
    this.accessToken = null;
    this.refreshPromise = null;
  }
  
  async request(url, options = {}) {
    // Add access token to request
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.accessToken}`
    };
    
    let response = await fetch(url, { ...options, headers, credentials: 'include' });
    
    // If 401, try refreshing token once
    if (response.status === 401 && !options._retry) {
      const refreshed = await this.refreshAccessToken();
      
      if (refreshed) {
        // Retry with new token
        return this.request(url, { ...options, _retry: true });
      } else {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        throw new Error('Authentication failed');
      }
    }
    
    return response;
  }
  
  async refreshAccessToken() {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    this.refreshPromise = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'  // Send HttpOnly cookie
    })
      .then(res => res.json())
      .then(data => {
        this.accessToken = data.accessToken;
        this.refreshPromise = null;
        return true;
      })
      .catch(() => {
        this.refreshPromise = null;
        return false;
      });
    
    return this.refreshPromise;
  }
  
  async login(email, password, rememberMe) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe }),
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.accessToken;
      return data.user;
    }
    
    throw new Error('Login failed');
  }
  
  async logout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    this.accessToken = null;
  }
}

const api = new AuthenticatedAPIClient();
```

### **Example 2: Enterprise SSO (OpenID Connect)**

**Scenario:** Company with 10+ internal apps, employees log in once

```javascript
// ============================================
// SSO Provider (Okta, Auth0, custom)
// ============================================
app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, state, response_type, scope } = req.query;
  
  // Check if user has active SSO session
  const ssoSessionId = req.cookies.sso_session;
  const ssoSession = await redis.get(`sso:${ssoSessionId}`);
  
  if (ssoSession) {
    // User already authenticated, skip login
    const code = generateAuthorizationCode(client_id, JSON.parse(ssoSession).userId);
    return res.redirect(`${redirect_uri}?code=${code}&state=${state}`);
  }
  
  // No SSO session, show login page
  res.render('login', { client_id, redirect_uri, state });
});

app.post('/oauth/login', async (req, res) => {
  const { username, password, client_id, redirect_uri, state } = req.body;
  
  // Validate credentials
  const user = await authenticateUser(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Create SSO session (shared across all apps)
  const ssoSessionId = uuidv4();
  await redis.set(`sso:${ssoSessionId}`, JSON.stringify({
    userId: user.id,
    email: user.email,
    createdAt: Date.now()
  }), 'EX', 8 * 3600);  // 8 hours
  
  // Set SSO session cookie
  res.cookie('sso_session', ssoSessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',  // Cross-site (different apps)
    domain: '.company.com',  // Shared across subdomains
    maxAge: 8 * 3600 * 1000
  });
  
  // Generate authorization code
  const code = generateAuthorizationCode(client_id, user.id);
  
  // Redirect back to app
  res.redirect(`${redirect_uri}?code=${code}&state=${state}`);
});

// ============================================
// App A (e.g., wiki.company.com)
// ============================================
app.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  
  const authURL = new URL('https://sso.company.com/oauth/authorize');
  authURL.searchParams.set('client_id', 'wiki-app');
  authURL.searchParams.set('redirect_uri', 'https://wiki.company.com/callback');
  authURL.searchParams.set('response_type', 'code');
  authURL.searchParams.set('scope', 'openid email profile');
  authURL.searchParams.set('state', state);
  
  res.redirect(authURL.toString());
});

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Validate state (CSRF protection)
  if (state !== req.session.oauthState) {
    return res.status(400).send('Invalid state');
  }
  
  // Exchange code for tokens
  const tokenResponse = await fetch('https://sso.company.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: 'wiki-app',
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: 'https://wiki.company.com/callback',
      grant_type: 'authorization_code'
    })
  });
  
  const { access_token, id_token } = await tokenResponse.json();
  
  // Verify and decode ID token
  const user = jwt.verify(id_token, SSO_PUBLIC_KEY);
  
  // Create local session for this app
  req.session.userId = user.sub;
  req.session.email = user.email;
  
  res.redirect('/dashboard');
});

// User experience:
// 1. Visit wiki.company.com → Redirects to SSO
// 2. Login at SSO once
// 3. Redirected back to wiki, logged in
// 4. Visit email.company.com → Redirects to SSO
// 5. SSO sees existing session → Auto-login (no password prompt!)
// 6. Redirected to email, logged in
```

### **Example 3: Social Login (OAuth 2.0 with Google)**

```javascript
// ============================================
// Frontend - Login Button
// ============================================
function LoginWithGoogle() {
  const handleGoogleLogin = () => {
    const clientId = 'YOUR_GOOGLE_CLIENT_ID';
    const redirectUri = 'https://yourapp.com/auth/google/callback';
    const scope = 'openid email profile';
    
    const authURL = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authURL.searchParams.set('client_id', clientId);
    authURL.searchParams.set('redirect_uri', redirectUri);
    authURL.searchParams.set('response_type', 'code');
    authURL.searchParams.set('scope', scope);
    authURL.searchParams.set('state', generateRandomState());
    
    window.location.href = authURL.toString();
  };
  
  return (
    <button onClick={handleGoogleLogin}>
      <GoogleIcon /> Continue with Google
    </button>
  );
}

// ============================================
// Backend - Callback Handler
// ============================================
app.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: 'https://yourapp.com/auth/google/callback',
      grant_type: 'authorization_code'
    })
  });
  
  const { access_token, id_token } = await tokenResponse.json();
  
  // Verify ID token
  const ticket = await googleAuth.verifyIdToken({
    idToken: id_token,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  
  const payload = ticket.getPayload();
  const { sub: googleId, email, name, picture } = payload;
  
  // Find or create user in your database
  let user = await db.users.findOne({ googleId });
  
  if (!user) {
    user = await db.users.create({
      googleId,
      email,
      name,
      profilePicture: picture,
      authProvider: 'google'
    });
  }
  
  // Create session/JWT for your app
  const sessionToken = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  // Redirect to frontend with token
  res.redirect(`https://yourapp.com/auth/success?token=${sessionToken}`);
});
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Interview Answer (7+ years level):**

*"There are several authentication flows, each with different trade-offs:*

**Session-Based:** Traditional approach where the server maintains session state. After login, the server stores session data (in Redis or a database) and sends a session ID in an HttpOnly cookie. It's great for server-rendered apps and provides instant revocation, but requires shared session storage for horizontal scaling.

**Token-Based (JWT):** Stateless approach where the server issues a JWT containing user info. The client stores it and sends it with every request. Servers verify the signature without needing storage lookups. Perfect for SPAs and microservices, but you can't revoke tokens before expiry without maintaining a blacklist.

**Refresh Token Pattern:** Hybrid approach using short-lived access tokens (15 min) and long-lived refresh tokens (7 days). When the access token expires, the client uses the refresh token to get a new one silently. This provides security (short access token validity) and UX (no frequent logins). The refresh token is stored as an HttpOnly cookie and can be revoked.

**OAuth 2.0:** Used for third-party login or delegated authorization. The Authorization Code flow is most secure: user authenticates with the provider (Google, GitHub), your backend exchanges an authorization code for tokens, then creates a session/JWT in your system.

*In production at scale, I use JWT access tokens stored in memory + refresh tokens in HttpOnly cookies. This provides:*
- XSS protection (tokens not in localStorage)
- Stateless API servers (JWT verification only)
- Revocation capability (refresh token in database)
- Seamless token refresh (good UX)
- Works across SPAs, mobile, and microservices"*

### **Likely Follow-up Questions:**

**Q1: "Where should you store JWTs in the browser?"**
*A: The most secure option is in-memory (a JavaScript variable). It's lost on page refresh, but that's when you use a refresh token. Never use localStorage—it's vulnerable to XSS. If you must persist access tokens, use an HttpOnly cookie set by the backend. The best pattern: access token in memory, refresh token in HttpOnly cookie.*

**Q2: "How do you handle token refresh without disrupting UX?"**
*A: I implement automatic token refresh in the API client. When a request returns 401, the client calls the /refresh endpoint with the refresh token (HttpOnly cookie sent automatically). If successful, it retries the original request with the new access token. All this happens transparently—the user never notices. I also proactively refresh tokens a few minutes before expiry to avoid failed requests.*

**Q3: "How do you prevent CSRF with token-based auth?"**
*A: If tokens are in custom headers (Authorization: Bearer), CSRF isn't a concern—browsers won't auto-send custom headers cross-origin, and CORS preflight blocks malicious attempts. If using cookies for tokens, you need CSRF protection (tokens or SameSite=Strict). That's another reason I prefer JWTs in Authorization headers for APIs.*

**Q4: "How do you implement 'logout from all devices'?"**
*A: With sessions, just delete all sessions for that user—instant revocation. With JWTs, it's harder since they're stateless. I maintain refresh tokens in the database with device info. On "logout all", I delete all refresh tokens for that user. Access tokens remain valid until expiry (15 min), but users can't get new ones. For immediate revocation, you'd need a token blacklist (Redis), but that defeats statelessness.*

**Q5: "How does SSO work across multiple subdomains?"**
*A: The SSO provider sets a cookie with domain=.company.com, making it accessible to all subdomains. When a user visits wiki.company.com, it redirects to sso.company.com. The SSO server checks for an existing session cookie. If found, it immediately issues an authorization code without prompting for credentials. The app exchanges the code for tokens and creates a local session. Same process for email.company.com—SSO sees the session cookie, so no login prompt.*

### **Trade-offs Comparison:**

| Flow | Best For | Pros | Cons |
|------|----------|------|------|
| **Session-Based** | Server-rendered, traditional apps | Instant revocation, simpler | Doesn't scale horizontally without shared storage |
| **JWT Only** | Microservices, stateless systems | Scales perfectly, no storage | Can't revoke, must be short-lived |
| **JWT + Refresh** | SPAs, mobile apps (best overall) | Revocable + scalable | More complex implementation |
| **OAuth 2.0** | Third-party login, API delegation | Don't manage passwords, better UX | Depends on external provider |
| **SSO** | Enterprise, multiple related apps | One login for all apps | Complex setup, vendor lock-in |

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters:**

**UX Impact:**
- Users expect seamless login (social providers)
- Staying logged in across sessions
- No interruptions when tokens expire

**Performance Impact:**
- Session lookups: 1-5ms (Redis) per request
- JWT verification: 0.1ms (no network)
- Token refresh: ~50ms (once per 15 min)

**Business Impact:**
- Security breaches from weak auth = regulatory fines, lost trust
- Good auth enables multi-device experiences
- SSO reduces friction in enterprise sales

### **How It Works:**

**Authentication Chain:**
```
User submits credentials
  ↓
Server validates (database lookup + password hash comparison)
  ↓
Server creates session/token
  ↓
Client stores session ID/token
  ↓
Client includes in subsequent requests
  ↓
Server validates session/token
  ↓
Server returns protected data
```

**Key Principles:**
1. **Never store passwords in plain text** - Use bcrypt/argon2
2. **Use HTTPS always** - Auth over HTTP = plaintext credentials
3. **Short-lived access tokens** - 15 min max
4. **Long-lived refresh tokens** - Stored securely, revocable
5. **Defense-in-depth** - Multiple security layers

**Production Checklist:**
- [ ] HTTPS enforced everywhere
- [ ] Passwords hashed with bcrypt (cost >= 12)
- [ ] Access tokens expire in 15 min
- [ ] Refresh tokens stored as HttpOnly cookies
- [ ] CSRF protection if using cookies for auth
- [ ] Rate limiting on login endpoints
- [ ] Account lockout after failed attempts
- [ ] Multi-factor authentication for sensitive operations
- [ ] Audit logging for auth events
- [ ] Token revocation on logout
- [ ] "Logout from all devices" feature
- [ ] Session/token monitoring and alerting
