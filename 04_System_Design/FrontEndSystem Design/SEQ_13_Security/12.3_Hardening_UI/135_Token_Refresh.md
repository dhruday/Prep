# 255 – Token Refresh — Silent Refresh Pattern

---

## 1. HIGH-LEVEL EXPLANATION

The **Silent Refresh Pattern** keeps a user's session alive by proactively renewing short-lived access tokens in the background — without interrupting UX. An access token (JWT, typically 15–60 minutes) is refreshed using a long-lived refresh token stored in an httpOnly cookie before it expires. No page reload, no login prompt. This is the industry standard at Microsoft (MSAL.js), Salesforce, and Adobe — any enterprise SPA with persistent sessions uses it.

---

## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Storage Strategy — The Core Decision

| Strategy | Access Token | Refresh Token | XSS Risk | CSRF Risk |
|----------|-------------|---------------|----------|-----------|
| Best: httpOnly cookie + memory | In-memory JS only | httpOnly Secure SameSite=Strict cookie | Low | Mitigated |
| Bad: localStorage | localStorage | localStorage | HIGH — any XSS reads it | N/A |
| Bad: sessionStorage | sessionStorage | sessionStorage | High | N/A |

**Rule:** Refresh token in httpOnly cookie (server-set, JS cannot read it). Access token in JS memory variable — never persisted.

### Data Flow

```
App Bootstrap
  → POST /api/auth/refresh (browser auto-sends httpOnly cookie)
  → 200 { accessToken: "eyJ...", expiresIn: 900 }
  → Store in memory + schedule next refresh at (expiresIn - 60s)

User makes API call
  → axios interceptor reads memory token, sets Authorization: Bearer
  → 401? → acquire refresh lock → call /refresh once → retry original

Refresh fails (cookie expired)?
  → Redirect to /login
```

### Performance Implications

- Silent refresh adds ~200ms per session — negligible
- On backgrounded tabs: `document.visibilitychange` should resync the timer
- **Refresh Lock (critical):** If 10 parallel API calls all 401, they must not each trigger a refresh. Use a shared promise: all callers await the same in-flight refresh

### Anti-Patterns

- Storing access tokens in localStorage — XSS attack reads them trivially
- No concurrent-401 handling — N requests all trigger N refresh calls
- Storing refresh token in localStorage — attacker gets indefinite session
- Not using refresh token rotation server-side — allows reuse after token theft
- Missing `_retried` flag in interceptor — causes infinite retry loop

---

## 3. REAL-WORLD EXAMPLES

**Microsoft Teams:** Azure AD issues 1-hour access tokens. MSAL.js implements `acquireTokenSilent()` — httpOnly cookie + in-memory access token, exactly this pattern.

**SAP (Hruday's stack):** SAP Fiori BI Launchpad uses OAuth 2.0 PKCE. Silent refresh fires 60s before JWT expiry, ensuring zero session interruptions across 8-hour enterprise user sessions.

**Scale:**
- 1K users → `setTimeout` works fine
- 10M users → Redis token store with server-side rotation; short tokens limit blast radius of theft

---

## 4. INTERVIEW-ORIENTED ANSWER

**Sample Answer (7+ years level):**

> "The silent refresh pattern solves session continuity without UX interruption. Access tokens live in JS memory only — never localStorage — to prevent XSS theft. The refresh token is in an httpOnly Secure SameSite=Strict cookie, invisible to JavaScript. On app bootstrap, I call /auth/refresh which reads the cookie server-side and returns a new access token. I schedule the next refresh at expiry minus 60 seconds. All API calls go through an axios interceptor that attaches the Bearer token from memory.
>
> The critical edge case is concurrent 401s — if 10 API calls all 401 simultaneously, they must not each trigger a refresh. I solve this with a refresh lock: a shared promise that all callers await, ensuring exactly one refresh call fires. At SAP I implemented this for the BI Launchpad, achieving zero session interruptions during 8-hour sessions."

**Follow-up Questions:**

1. *Where is the access token stored?* → JS memory only — module-level variable or auth store state
2. *What happens on page refresh?* → App re-bootstraps and calls /refresh — the httpOnly cookie persists across page loads
3. *How do you handle concurrent 401s?* → Refresh lock: single promise, all callers `await` the same promise
4. *What is refresh token rotation?* → Each /refresh call invalidates the old refresh token and issues a new one — prevents reuse after theft
5. *How do you sync across browser tabs?* → `BroadcastChannel` API for signalling token renewal (not for storing tokens)
6. *Why not sessionStorage?* → Still readable by XSS; cleared on tab close (bad UX); doesn't survive navigation

**Comparison:**

| Approach | Security | UX | Complexity |
|----------|----------|-----|------------|
| Silent refresh + httpOnly cookie (**recommended**) | High | Seamless | Medium |
| localStorage tokens | Low | Seamless | Low |
| Session cookie only (no JWT) | High | Seamless | Low |
| Short token + force re-login | High | Poor | Low |

---

## 5. CODE EXAMPLE

```typescript
// auth-service.ts — Production-grade silent refresh

let accessToken: string | null = null;
let refreshLock: Promise<string> | null = null;

// Call on every app bootstrap (before rendering protected routes)
export async function initSession(): Promise<boolean> {
  try {
    accessToken = await performSilentRefresh();
    return true;
  } catch {
    accessToken = null;
    return false; // caller should redirect to /login
  }
}

async function performSilentRefresh(): Promise<string> {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include', // CRITICAL — sends the httpOnly refresh token cookie
  });
  if (!res.ok) throw new Error('Session expired');
  const { accessToken: token, expiresIn } = await res.json();
  scheduleNextRefresh(expiresIn);
  return token;
}

function scheduleNextRefresh(expiresInSeconds: number): void {
  const delay = Math.max(0, (expiresInSeconds - 60) * 1000);
  setTimeout(async () => {
    try { accessToken = await performSilentRefresh(); }
    catch { window.location.href = '/login'; }
  }, delay);
}

// Axios: concurrent 401 deduplication via refresh lock
axiosInstance.interceptors.response.use(
  response => response,
  async (error) => {
    const req = error.config;
    if (error.response?.status !== 401 || req._retried) return Promise.reject(error);
    req._retried = true; // prevent infinite loop

    if (!refreshLock) {
      refreshLock = performSilentRefresh().finally(() => { refreshLock = null; });
    }
    try {
      accessToken = await refreshLock;
      req.headers['Authorization'] = `Bearer ${accessToken}`;
      return axiosInstance(req); // retry with new token
    } catch {
      window.location.href = '/login';
      return Promise.reject(error);
    }
  }
);

// Axios: attach token to every request
axiosInstance.interceptors.request.use(config => {
  if (accessToken) config.headers['Authorization'] = `Bearer ${accessToken}`;
  return config;
});
```

**Why this works:**
- `credentials: 'include'` triggers the browser to send the httpOnly refresh token cookie
- `refreshLock` is the deduplication mechanism — 10 concurrent 401s all await the same promise
- `_retried` flag prevents infinite retry if the retry itself 401s
- Scheduler is proactive; the 401 handler is a safety net

---

## 6. MEMORY AID

**"Memory token. Cookie refresh. Lock the stampede."**
- Access token → **memory only** (XSS cannot read JavaScript memory variables)
- Refresh token → **httpOnly cookie** (JS cannot touch it at all)
- Concurrent 401s → **one promise, all callers await** (refresh lock)
- Page reload → **bootstrap calls /refresh** (cookie persists, memory recreated)

*If you blank in interview: "Access token in memory, refresh token in an httpOnly cookie JavaScript can't read. Silent refresh fires before expiry and a lock prevents concurrent refresh storm."*

---

## 7. WHY & HOW SUMMARY

**Why it matters:**
Enterprise users work 8-hour sessions. Without silent refresh, every JWT expiry forces a re-login — catastrophic UX for enterprise products.

**How it works:**
Access token stored in JS memory variable. Refresh token in httpOnly Secure cookie. On bootstrap, /refresh endpoint is called — cookie is sent automatically, new access token is returned and stored in memory. Scheduler fires 60s before expiry. Axios interceptors handle attach + retry.

**Company relevance:**
- **Microsoft:** MSAL.js `acquireTokenSilent()` is this exact pattern — Azure AD, Teams, Office 365 all rely on it
- **Adobe:** Adobe IMS (Identity Management System) uses silent refresh for Creative Cloud sessions — impossible without it
- **Salesforce:** OAuth 2.0 refresh token flow for external apps connecting to Salesforce APIs
- **Cisco:** WebEx and network monitoring dashboards require persistent 8-hour authenticated sessions
