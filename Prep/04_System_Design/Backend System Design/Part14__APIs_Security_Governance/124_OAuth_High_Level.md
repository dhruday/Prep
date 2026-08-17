# 124. OAuth 2.0 (High Level)

## 📌 Overview

**OAuth 2.0** is an authorization framework that allows third-party apps to access user data **without sharing passwords**.

**Use case**: "Login with Google" button

```
❌ Old way:
User gives password to third-party app → App logs in as user

✓ OAuth way:
User authorizes app on Google → App gets access token → App uses token (no password)
```

**Benefits**:
- No password sharing
- Limited access (scopes)
- Revocable (user can revoke access)

---

## 🎯 OAuth Roles

### **1. Resource Owner** (User)

Person who owns the data (e.g., your Google account)

### **2. Client** (Application)

Third-party app requesting access (e.g., "PhotoPrinter.com")

### **3. Authorization Server** (OAuth Provider)

Issues tokens after user authorizes (e.g., accounts.google.com)

### **4. Resource Server** (API)

Protects user data, accepts access tokens (e.g., gmail.googleapis.com)

```
┌──────────────┐
│ Resource     │ (User)
│ Owner        │
└──────┬───────┘
       │ 1. Authorize app
       ▼
┌──────────────┐      2. Code      ┌──────────────┐
│ Authorization│◄─────────────────►│ Client       │
│ Server       │      3. Token      │ (App)        │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │ 4. Validate token                 │ 5. API call + token
       ▼                                   ▼
┌──────────────┐                    ┌──────────────┐
│ Resource     │◄───────────────────│ User data    │
│ Server (API) │                    │              │
└──────────────┘                    └──────────────┘
```

---

## 🎯 OAuth Flows (Grant Types)

### **1. Authorization Code Flow** ⭐ (Most Secure)

**Use case**: Web apps, mobile apps

**Steps**:

```
1. User clicks "Login with Google"
2. App redirects to Google authorization URL
3. User approves permissions
4. Google redirects back with authorization code
5. App exchanges code for access token (server-side)
6. App uses access token to call API
```

**Detailed flow**:

```python
# Step 1: Redirect to authorization URL
GET https://accounts.google.com/o/oauth2/v2/auth?
    client_id=YOUR_CLIENT_ID&
    redirect_uri=https://yourapp.com/callback&
    response_type=code&
    scope=profile email&
    state=random_string_for_csrf

# Step 2: User approves → Google redirects
GET https://yourapp.com/callback?
    code=AUTHORIZATION_CODE&
    state=random_string_for_csrf

# Step 3: Exchange code for token (server-side)
POST https://oauth2.googleapis.com/token
{
  "code": "AUTHORIZATION_CODE",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",  # Secret NOT exposed to browser
  "redirect_uri": "https://yourapp.com/callback",
  "grant_type": "authorization_code"
}

# Response
{
  "access_token": "ya29.a0AfH6SMB...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "refresh_token": "1//0gKc...",
  "scope": "profile email"
}

# Step 4: Use access token
GET https://www.googleapis.com/oauth2/v1/userinfo
Authorization: Bearer ya29.a0AfH6SMB...

# Response
{
  "id": "1234567890",
  "email": "user@gmail.com",
  "verified_email": true,
  "name": "John Doe",
  "picture": "https://..."
}
```

**Why code + token exchange?**
- **Code** exposed in redirect URL (browser history, logs)
- **Token** exchanged server-side with **client_secret** (not exposed to browser)
- **Prevents**: Token theft from browser

**Implementation (Flask)**:

```python
from flask import Flask, redirect, request, session
import requests

app = Flask(__name__)
app.secret_key = 'your-secret-key'

GOOGLE_CLIENT_ID = 'your-client-id'
GOOGLE_CLIENT_SECRET = 'your-client-secret'
GOOGLE_REDIRECT_URI = 'http://localhost:5000/callback'

@app.route('/login')
def login():
    # Step 1: Redirect to Google
    import secrets
    state = secrets.token_urlsafe(16)
    session['oauth_state'] = state
    
    auth_url = (
        'https://accounts.google.com/o/oauth2/v2/auth?'
        f'client_id={GOOGLE_CLIENT_ID}&'
        f'redirect_uri={GOOGLE_REDIRECT_URI}&'
        'response_type=code&'
        'scope=profile email&'
        f'state={state}'
    )
    return redirect(auth_url)

@app.route('/callback')
def callback():
    # Step 2: Verify state (CSRF protection)
    state = request.args.get('state')
    if state != session.get('oauth_state'):
        return 'Invalid state', 400
    
    # Step 3: Exchange code for token
    code = request.args.get('code')
    token_response = requests.post('https://oauth2.googleapis.com/token', data={
        'code': code,
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'redirect_uri': GOOGLE_REDIRECT_URI,
        'grant_type': 'authorization_code'
    })
    
    tokens = token_response.json()
    access_token = tokens['access_token']
    
    # Step 4: Get user info
    userinfo_response = requests.get(
        'https://www.googleapis.com/oauth2/v1/userinfo',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    user_info = userinfo_response.json()
    
    # Step 5: Create session
    session['user_id'] = user_info['id']
    session['user_email'] = user_info['email']
    
    return f'Welcome {user_info["name"]}!'
```

**Pros**:
- Most secure (client_secret not exposed)
- Supports refresh tokens

**Cons**:
- Requires server-side exchange

---

### **2. Client Credentials Flow**

**Use case**: Server-to-server (no user involved)

**Example**: Your backend service calls Stripe API

**Steps**:

```python
# No user authorization
# App exchanges client_id + client_secret for token

POST https://oauth2.googleapis.com/token
{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "grant_type": "client_credentials",
  "scope": "read:data"
}

# Response
{
  "access_token": "2YotnFZFEjr1zCsicMWpAA",
  "token_type": "Bearer",
  "expires_in": 3600
}

# Use token
GET /api/data
Authorization: Bearer 2YotnFZFEjr1zCsicMWpAA
```

**Implementation**:

```python
import requests

def get_access_token():
    response = requests.post('https://api.example.com/oauth/token', data={
        'client_id': 'YOUR_CLIENT_ID',
        'client_secret': 'YOUR_CLIENT_SECRET',
        'grant_type': 'client_credentials'
    })
    return response.json()['access_token']

def call_api():
    token = get_access_token()
    response = requests.get('https://api.example.com/data',
                           headers={'Authorization': f'Bearer {token}'})
    return response.json()
```

**Pros**:
- Simple (no user interaction)
- Server-to-server

**Cons**:
- No user context (app-level access)

---

### **3. Implicit Flow** ❌ (DEPRECATED)

**Use case**: Browser-only apps (SPAs) - **NO LONGER RECOMMENDED**

**Why deprecated?**
- Access token exposed in URL fragment (browser history)
- No refresh token
- Security risk

**Replaced by**: Authorization Code Flow + PKCE (see below)

---

### **4. Resource Owner Password Credentials** ❌ (Legacy)

**Use case**: User gives credentials directly to app

```python
POST /oauth/token
{
  "username": "john@example.com",
  "password": "secret123",
  "grant_type": "password",
  "client_id": "YOUR_CLIENT_ID"
}

# Response
{
  "access_token": "...",
  "token_type": "Bearer"
}
```

**Why avoid?**
- App sees user password (defeats OAuth purpose)
- Only for trusted first-party apps
- Migration path from legacy systems

---

## 🎯 PKCE (Proof Key for Code Exchange)

**Problem**: Mobile/SPA apps can't store **client_secret** securely

**Solution**: PKCE adds dynamic secret (code_verifier + code_challenge)

**Steps**:

```python
# Step 1: Generate code_verifier (random string)
import secrets
code_verifier = secrets.token_urlsafe(32)

# Step 2: Generate code_challenge (SHA256 hash)
import hashlib
import base64
code_challenge = base64.urlsafe_b64encode(
    hashlib.sha256(code_verifier.encode()).digest()
).decode().rstrip('=')

# Step 3: Authorization URL includes code_challenge
GET https://accounts.google.com/o/oauth2/v2/auth?
    client_id=YOUR_CLIENT_ID&
    redirect_uri=https://yourapp.com/callback&
    response_type=code&
    code_challenge=CODE_CHALLENGE&
    code_challenge_method=S256&
    scope=profile email

# Step 4: Exchange code with code_verifier
POST https://oauth2.googleapis.com/token
{
  "code": "AUTHORIZATION_CODE",
  "client_id": "YOUR_CLIENT_ID",
  "code_verifier": "CODE_VERIFIER",  # Auth server verifies SHA256(verifier) == challenge
  "redirect_uri": "https://yourapp.com/callback",
  "grant_type": "authorization_code"
}
```

**Why secure?**
- Attacker intercepts **code** but doesn't have **code_verifier**
- Without verifier, can't exchange code for token

**Use case**: Mobile apps, SPAs (no client_secret needed)

---

## 🎯 Tokens

### **Access Token**

- **Purpose**: Access protected resources
- **Lifespan**: Short (1-2 hours)
- **Format**: JWT or opaque string

```
GET /api/data
Authorization: Bearer ya29.a0AfH6SMB...
```

### **Refresh Token**

- **Purpose**: Get new access token without re-authentication
- **Lifespan**: Long (days, weeks, months)
- **Stored**: Securely (not in browser localStorage)

```python
# Access token expired
# Use refresh token to get new access token

POST /oauth/token
{
  "grant_type": "refresh_token",
  "refresh_token": "1//0gKc...",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}

# Response
{
  "access_token": "NEW_ACCESS_TOKEN",
  "expires_in": 3600
}
```

### **ID Token** (OpenID Connect)

- **Purpose**: User identity information
- **Format**: JWT with user claims

```json
{
  "iss": "https://accounts.google.com",
  "sub": "1234567890",
  "email": "user@gmail.com",
  "name": "John Doe",
  "picture": "https://...",
  "exp": 1704460800,
  "iat": 1704457200
}
```

---

## 🎯 Scopes

**Scopes** define permissions granted to app

```
scope=profile email drive.readonly

# App can:
# - Read profile info ✓
# - Read email ✓
# - Read Google Drive files ✓
# - Write Google Drive files ❌ (not granted)
```

**Examples**:

```
# Google
profile           # Basic profile info
email             # Email address
drive             # Full Google Drive access
drive.readonly    # Read-only Drive
calendar          # Google Calendar access

# GitHub
repo              # Full repo access
repo:status       # Commit status
user:email        # Email address
read:org          # Read org data

# Stripe
read_only         # Read-only
read_write        # Read and write
```

**Validation**:

```python
# Resource server checks token scopes
def require_scope(required_scope):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            token = request.headers.get('Authorization', '').replace('Bearer ', '')
            
            # Verify token (introspection or JWT decode)
            token_info = verify_token(token)
            scopes = token_info.get('scope', '').split()
            
            if required_scope in scopes:
                return f(*args, **kwargs)
            else:
                return jsonify({'error': f'Missing scope: {required_scope}'}), 403
        return decorated
    return decorator

@app.route('/api/drive/files')
@require_scope('drive.readonly')
def list_files():
    # Requires "drive.readonly" scope
    pass
```

---

## 🎯 Security Best Practices

### **1. Use State Parameter (CSRF Protection)**

```python
# Generate random state
state = secrets.token_urlsafe(16)
session['oauth_state'] = state

# Include in authorization URL
auth_url = f'...&state={state}'

# Verify in callback
if request.args.get('state') != session.get('oauth_state'):
    return 'CSRF attack detected', 400
```

### **2. Validate Redirect URI**

```python
# Whitelist allowed redirect URIs
ALLOWED_REDIRECTS = [
    'http://localhost:5000/callback',
    'https://yourapp.com/callback'
]

if redirect_uri not in ALLOWED_REDIRECTS:
    return 'Invalid redirect_uri', 400
```

### **3. Use HTTPS Only**

```
❌ http://yourapp.com/callback  # Token exposed in URL
✓ https://yourapp.com/callback  # Encrypted
```

### **4. Store Refresh Tokens Securely**

```python
# ❌ Browser localStorage (XSS risk)
localStorage.setItem('refresh_token', token)

# ✓ HttpOnly cookie (not accessible to JavaScript)
response.set_cookie('refresh_token', token, httponly=True, secure=True, samesite='Strict')

# ✓ Server-side database
db.store_refresh_token(user_id, token)
```

### **5. Rotate Refresh Tokens**

```python
# After using refresh token, issue new one
POST /oauth/token
{
  "grant_type": "refresh_token",
  "refresh_token": "OLD_REFRESH_TOKEN"
}

# Response
{
  "access_token": "NEW_ACCESS_TOKEN",
  "refresh_token": "NEW_REFRESH_TOKEN"  # Old one invalidated
}
```

---

## 🎯 Real-World Examples

### **1. Google OAuth**

```python
# Authorization URL
https://accounts.google.com/o/oauth2/v2/auth?
    client_id=YOUR_CLIENT_ID.apps.googleusercontent.com&
    redirect_uri=https://yourapp.com/callback&
    response_type=code&
    scope=profile email

# Token endpoint
https://oauth2.googleapis.com/token

# User info endpoint
https://www.googleapis.com/oauth2/v1/userinfo

# Scopes
profile, email, drive, calendar, etc.
```

### **2. GitHub OAuth**

```python
# Authorization URL
https://github.com/login/oauth/authorize?
    client_id=YOUR_CLIENT_ID&
    redirect_uri=https://yourapp.com/callback&
    scope=repo user:email

# Token endpoint
https://github.com/login/oauth/access_token

# API endpoint
https://api.github.com/user
Authorization: Bearer ghp_...

# Scopes
repo, repo:status, user, user:email, read:org
```

### **3. Stripe Connect**

```python
# Connect merchant accounts
# Platform connects to merchant's Stripe account

# Authorization URL
https://connect.stripe.com/oauth/authorize?
    response_type=code&
    client_id=ca_...&
    scope=read_write

# Token endpoint
https://connect.stripe.com/oauth/token

# Access merchant's data
GET https://api.stripe.com/v1/charges
Authorization: Bearer sk_test_...
Stripe-Account: acct_...  # Merchant account ID
```

---

## ✅ Best Practices Summary

1. **Use Authorization Code Flow** (most secure)
2. **Use PKCE** for mobile/SPA (no client_secret)
3. **State parameter** (CSRF protection)
4. **HTTPS only** (encrypt tokens)
5. **Short-lived access tokens** (1-2 hours)
6. **Secure refresh tokens** (HttpOnly cookies, server-side)
7. **Validate redirect URIs** (whitelist)
8. **Minimal scopes** (least privilege)

---

## 🎓 Interview Tips

**Q: "What is OAuth 2.0?"**

A: "OAuth 2.0 is an **authorization framework** that allows third-party apps to access user data without sharing passwords.

**Example**: 'Login with Google' button
- User authorizes app on Google
- App gets access token
- App uses token to call Google API (no password shared)

**Benefits**:
- No password sharing
- Limited access (scopes like read:email, write:calendar)
- Revocable (user can revoke access anytime)

**Key concepts**:
- **Roles**: Resource Owner (user), Client (app), Authorization Server (Google), Resource Server (API)
- **Flows**: Authorization Code (web apps), Client Credentials (server-to-server)
- **Tokens**: Access token (short-lived 1 hour), Refresh token (long-lived 30 days)
- **Scopes**: Permissions (profile, email, drive.readonly)"

**Q: "Explain OAuth Authorization Code Flow"**

A: "Most secure OAuth flow for web/mobile apps:

**Steps**:
1. User clicks 'Login with Google'
2. **Redirect** to authorization URL with client_id, redirect_uri, scope
3. User **approves** permissions
4. **Redirect back** with authorization **code** (not token)
5. App **exchanges code for token** server-side with **client_secret**
6. App **uses access token** to call API

**Why code + token exchange?**
- Code exposed in URL (browser history, logs)
- Token exchanged **server-side** with **client_secret** (not exposed to browser)
- **Prevents**: Token theft from browser

**PKCE** (mobile/SPA): No client_secret, uses code_verifier + code_challenge instead

**Security**: State parameter (CSRF), HTTPS, validate redirect_uri"

**Q: "What are access tokens vs refresh tokens?"**

A: "**Access Token**:
- **Purpose**: Access protected resources (API calls)
- **Lifespan**: Short (1-2 hours)
- **Usage**: `Authorization: Bearer token`
- **Security**: Short-lived limits blast radius if stolen

**Refresh Token**:
- **Purpose**: Get new access token without re-authentication
- **Lifespan**: Long (days/weeks)
- **Usage**: POST /oauth/token with grant_type=refresh_token
- **Security**: Stored securely (HttpOnly cookie, server-side DB, NOT localStorage)

**Why both?**
- Access token frequently sent (every API call) → higher risk → short-lived
- Refresh token rarely sent (only to refresh) → lower risk → long-lived

**Rotation**: After using refresh token, issue new one (invalidate old)

Real-world: Google access token 1 hour, refresh token until revoked"

---

## 📚 Summary

**OAuth 2.0**: Authorization framework (third-party access without password)

**Flows**: Authorization Code (web/mobile), Client Credentials (server-to-server)

**PKCE**: For mobile/SPA (no client_secret, uses code_verifier)

**Tokens**: Access (short-lived API calls), Refresh (long-lived get new access), ID (user info)

**Scopes**: Permissions (profile, email, drive.readonly)

**Security**: State (CSRF), HTTPS, validate redirect_uri, secure refresh tokens 🚀

