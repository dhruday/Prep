# 179 – JWT Deep Dive

> **Part 12 — Security · Module 12.2: Auth & Tokens**

## What is a JWT?

JSON Web Token (JWT) is an open standard (RFC 7519) for securely transmitting claims between parties as a compact, URL-safe string in the format **Header.Payload.Signature**.

```
eyJhbGciOiJSUzI1NiJ9  .  eyJzdWIiOiJ1c2VyXzEyMyJ9  .  SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV
      HEADER                       PAYLOAD                      SIGNATURE
```

---

## Structure

### Header

```json
{
  "alg": "RS256",   // asymmetric — preferred over HS256 for APIs
  "typ": "JWT"
}
```

### Payload (Claims)

| Claim | Type | Meaning |
|---|---|---|
| `iss` | Registered | Issuer (e.g., "https://auth.company.com") |
| `sub` | Registered | Subject — unique user ID |
| `aud` | Registered | Audience — which API this token is for |
| `exp` | Registered | Expiry timestamp (Unix seconds) |
| `iat` | Registered | Issued-at timestamp |
| `jti` | Registered | JWT ID — unique token ID, used for revocation |
| `roles` | Private | Custom: user roles array |
| `email` | Private | Custom: user email |

### Signature

```
RSASHA256(
  base64url(header) + "." + base64url(payload),
  privateKey      // signed by auth server
)
```

> **CRITICAL**: `privateKey` stays on the auth server. API servers only need the `publicKey` to verify — never the private key.

---

## Access Token vs Refresh Token

| Property | Access Token | Refresh Token |
|---|---|---|
| **Lifetime** | Short (5–15 min) | Long (7–30 days) |
| **Storage** | Memory (React state) | HttpOnly cookie |
| **Purpose** | Authorize API calls | Obtain new access tokens |
| **Sent on every request** | Yes (Authorization header) | No (only to /auth/refresh) |
| **Revocable** | Via expiry only | Yes — server-side revocation list |

---

## Silent Refresh Pattern

```
Browser                    Auth API              Resource API
   │                          │                       │
   │──── GET /data ──────────────────────────────────►│
   │                          │               401 expired│◄─────┤
   │◄──── 401 Unauthorized ──────────────────────────|│
   │                          │                       │
   │──POST /auth/refresh ────►│                       │
   │   [cookie: refreshToken] │                       │
   │◄── access_token (new) ───│                       │
   │                          │                       │
   │──── RETRY GET /data ─────────────────────────►  │
   │◄──── 200 OK ─────────────────────────────────── │
```

```typescript
// Axios interceptor for silent refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

axiosInstance.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue concurrent requests while refresh is in-flight
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers!['Authorization'] = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axiosInstance.post('/auth/refresh');
        const newToken = data.accessToken;
        setAccessToken(newToken);             // store in memory
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        failedQueue.forEach(p => p.resolve(newToken));
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        failedQueue.forEach(p => p.reject(refreshError));
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
        failedQueue = [];
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Security Pitfalls

### 1. Algorithm confusion attack (CVE-2015-9235)

```typescript
// ❌ Never trust "alg" from the token header!
// Attacker creates: { "alg": "none" } → removes signature verification
const token = base64Url({"alg":"none"}) + "." + base64Url(payload) + ".";
// Old libraries with alg:"none" bypass might accept this!

// ✅ Explicitly specify allowed algorithms:
jwt.verify(token, publicKey, { algorithms: ['RS256'] }); // NOT 'none'
```

### 2. HS256 vs RS256

```
HS256 (HMAC SHA-256):
  • Same key signs AND verifies
  • If microservice A has the key → it can forge tokens
  • OK only for single-service scenarios

RS256 (RSA SHA-256):
  • Auth server: privateKey (signs)
  • All API services: publicKey (verifies only — can't forge)
  • Better for microservices
```

### 3. JWT storage XSS vector

```typescript
// ❌ localStorage — readable by any JS (XSS can steal tokens)
localStorage.setItem('token', jwt);

// ✅ Memory variable — cleared on page close, XSS can't persist
let accessToken: string | null = null;
const setAccessToken = (t: string) => { accessToken = t; };

// Access token in memory + refresh token in HttpOnly cookie
// cookie: refreshToken=xxxxx; HttpOnly; Secure; SameSite=Strict
```

---

## JWT Revocation Strategies

| Strategy | Cost | Latency Impact | Works With |
|---|---|---|---|
| Short expiry (5 min) | Low | None | Stateless |
| Token blacklist (Redis) | Medium | ~1ms Redis lookup | Stateful |
| `jti` revocation list | Medium | ~1ms Redis lookup | Stateful |
| Refresh token rotation | Low | None | Stateless-ish |
| Token versioning in user record | Low | DB lookup per request | Stateful |

---

## Interview Talking Points

- **"Why not use sessions?"** → JWTs are stateless — no server-side session store, scales horizontally without sticky sessions
- **"What's in the payload?"** → Never sensitive PII, only identity claims. Payload is base64 encoded, NOT encrypted — anyone can decode it
- **"How do you handle logout?"** → Short-lived access tokens + revoke refresh token server-side + jti blacklist for critical operations
- **"RS256 vs HS256?"** → RS256 for microservices (only auth server has private key); HS256 only for monolith
- **"Silent refresh race condition?"** → Axios interceptor with refresh lock + queued retry pattern
