# Silent Refresh Pattern
> Part 10 — Security (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Silent refresh**: proactively refreshing an access token (or OIDC session) before it expires — so the user never sees a "session expired" error; they stay logged in seamlessly as long as they're actively using the app
- **Two patterns**: (1) Timer-based: schedule a refresh ~60 seconds before the access token expires; works for JWT access tokens with a known `exp` claim; (2) Iframe-based: for OIDC, embed a hidden iframe that calls the auth server's authorize endpoint with `prompt=none`; the auth server issues new tokens silently if the SSO session is still valid
- **The trade-off**: refresh token in `HttpOnly` cookie = cross-origin refresh requires `SameSite=None` or same-domain setup; access token in memory = lost on page reload, must re-fetch on startup using the refresh token cookie; balance between security and UX
- **On page reload**: the in-memory access token is gone; the SPA calls the refresh endpoint on startup (the `HttpOnly` refresh token cookie is still there); a new access token is fetched silently before the first API call; the user sees no login prompt
- **`prompt=none` (OIDC)**: tells the auth server "if the user has an active SSO session, issue new tokens without showing any UI; if not, return an error instead of the login page" — the SPA checks the error and redirects to login if the SSO session has expired
- ✅ At SAP: timer-based silent refresh with `angular-oauth2-oidc`'s `setupAutomaticSilentRefresh()` + startup token recovery from the refresh endpoint — zero re-login prompts for users working within their session window

---

## 1. One-Line Definition
The silent refresh pattern is a frontend technique that automatically renews an access token before it expires — using either a timer that triggers a background token exchange or an invisible iframe that asks the identity provider to re-issue tokens using an existing SSO session — keeping the user's session alive without any visible interruption.

---

## 2. The Problem It Solves

Access tokens have short expiry (15 minutes) for security. But users work for hours. What happens when the access token expires mid-session?

Option 1 — Do nothing: the next API call gets a 401. The SPA catches it, redirects to the login page. The user was in the middle of filling out a form. Their work is lost. This is terrible UX and is the default behaviour without silent refresh.

Option 2 — Long-lived access tokens: set expiry to 8 hours so users never get logged out during the work day. This is what teams without proper refresh do. The security cost: a stolen access token is valid all day. This is OWASP A07.

Option 3 — Silent refresh: keep the 15-minute access token for security, but proactively renew it in the background. The user never sees a login prompt. The stolen-token window stays at 15 minutes. Both security and UX are maintained.

The silent refresh pattern reconciles the security requirement (short-lived tokens, revocable sessions) with the UX requirement (users stay logged in while they're actively working).

---

## 3. How It Works Internally

### Pattern 1: Timer-Based Token Refresh (for JWT access tokens with refresh token)

```
On Login:
├── Receive access_token (JWT, 15 min expiry)
├── Receive refresh_token (opaque, in HttpOnly cookie)
├── Parse access_token's "exp" claim
└── Schedule refresh timer: fire at (exp - now - 60 seconds)

At (expiry - 60 seconds):
├── POST /auth/refresh (browser auto-sends HttpOnly refresh token cookie)
├── Server validates refresh token and issues new access_token
├── Update in-memory access token
├── Parse new token's "exp"
└── Schedule next refresh timer

On page reload:
├── In-memory access token is GONE (memory cleared)
├── SPA calls POST /auth/refresh on startup (HttpOnly cookie still present)
├── If refresh token valid: receives new access token → app continues
└── If refresh token expired: 401 → redirect to login

On user logout:
├── Call POST /auth/logout
├── Server invalidates refresh token in DB
├── Server adds jti to Redis blocklist
├── Clear HttpOnly refresh token cookie (Set-Cookie: refreshToken=; Max-Age=0)
└── Clear in-memory access token → redirect to login
```

### Pattern 2: iframe-Based Silent Refresh (for OIDC with SSO session)

```
OIDC auth servers maintain their own SSO session (separate from your app's session)
When the user logs into the OIDC provider, the provider sets its own session cookie
This SSO session can outlive your app's access token

Hidden iframe approach:
├── SPA creates a hidden <iframe> pointed at:
│     https://auth.company.com/authorize?
│       response_type=code
│       &client_id=spa-client
│       &redirect_uri=https://app.company.com/silent-renew.html
│       &scope=openid profile
│       &prompt=none        ← KEY: don't show UI; fail silently if no SSO session
│       &nonce=new-random-nonce
│
├── Auth server checks its SSO session cookie
│   ├── SSO session VALID → issues new code, redirects to silent-renew.html
│   └── SSO session EXPIRED → returns error=login_required
│
├── silent-renew.html (hosted at your domain) receives the code
├── Posts message to parent window with the new code
├── SPA exchanges code for new tokens (or uses implicit silent renewal)
└── Schedule next iframe refresh

On login_required error:
├── SSO session expired (e.g. user logged out of corporate SSO from another app)
└── Redirect the main window to login page
```

### Comparison of the Two Patterns

```
Timer-Based (refresh_token + HttpOnly cookie):
├── Works with: any OAuth/JWT setup
├── Requires: refresh token in HttpOnly cookie
├── Reload recovery: yes (refresh token cookie survives reload)
├── Security: refresh token rotation protects against theft
├── Complexity: LOW — schedule a setTimeout, POST to /refresh, update token
└── Best for: APIs where your app IS the auth server

iframe-Based (OIDC prompt=none):
├── Works with: OIDC providers with SSO (Google, Microsoft, SAP IAS, Keycloak)
├── Requires: OIDC provider SSO session; silent-renew.html endpoint
├── Reload recovery: yes (OIDC SSO session survives)
├── Security: depends on OIDC provider's session security
├── Complexity: MEDIUM — iframe communication, prompt=none, error handling
└── Best for: enterprise SSO, "login with Google", any external OIDC IdP
```

### Access Token Lifecycle (the complete picture)

```
User logs in
     │
     ▼
Access token (15 min) + Refresh token (HttpOnly cookie, 7 days)
     │
     │ Timer starts: (exp - 60s = 14 min from now)
     │
     │ <14 minutes passes, user is active>
     │
     ▼
Timer fires — silent refresh
     │
     ▼
POST /auth/refresh (browser sends HttpOnly cookie automatically)
     │    Server:
     │    ├── Validates refresh token (not used, not expired)
     │    ├── Marks old refresh token as used
     │    ├── Issues new access token (15 min)
     │    ├── Issues new refresh token (7 days) — rotation
     │    └── Sets new refresh token in HttpOnly cookie
     │
     ▼
New access token in memory
New timer scheduled
     │
     │ <User continues working>
     │
     │ ...this repeats every 14 minutes indefinitely
     │
     ▼
User logs out OR closes browser
     │
     ├── Active logout: DELETE refresh token from DB, clear cookie
     └── Browser close: cookie survives (not session cookie, has Max-Age)
                  └── Next visit: startup refresh succeeds → session restored
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```typescript
// Wrong: long-lived access token to avoid implementing refresh
// This is the "laziness tax" — avoids the complexity of refresh by accepting poor security
const authConfig = {
  issuer: 'https://auth.company.com',
  clientId: 'my-spa',
  responseType: 'code',
  scope: 'openid profile',
  // Access token expiry left at whatever the server defaults (often 24 hours)
  // No silent refresh configured — user stays logged in with a token that's valid all day
  // A stolen token is usable for up to 24 hours
  // setupAutomaticSilentRefresh not called
};

// Wrong: not handling token expiry in the HTTP interceptor
// The 401 hits the user directly — they see a broken UI or get thrown to login mid-task
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getAccessToken();
    if (token) {
      req = req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) });
    }
    // No 401 handling here — expired token causes visible API failures
    // User sees error messages rather than a seamless token renewal
    return next.handle(req);
  }
}
```

```typescript
// Wrong: storing access token in localStorage for persistence across page reload
// Avoids the startup refresh complexity by keeping the access token always available
// Security cost: XSS can steal the access token from localStorage
function login(response: TokenResponse) {
  // WRONG: access token in localStorage = XSS-readable
  localStorage.setItem('access_token', response.accessToken);
  localStorage.setItem('token_expiry', response.expiry.toString());
}
```

> **Why this fails in production:** 24-hour access tokens mean a stolen token is valid all day — a phishing attack or XSS that runs at 9am has until 9am the next day to do damage. `localStorage` token storage means XSS on any page on your domain gives the attacker the access token immediately. Both problems are solvable with the correct silent refresh pattern.

### Right Way — Production Quality

**Angular — `angular-oauth2-oidc` automatic silent refresh:**
```typescript
// app.component.ts or auth.service.ts — setup on application init
@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private oauthService: OAuthService) {}

  async initAuth(): Promise<void> {
    this.oauthService.configure({
      issuer: 'https://auth.company.com',
      clientId: 'angular-spa',
      responseType: 'code',
      redirectUri: window.location.origin + '/callback',
      // Silent renew: this URL must be a page that calls oauthService.initImplicitFlowInPopup
      // or a simple page that posts the URL to the parent – the library provides a template
      silentRefreshRedirectUri: window.location.origin + '/silent-renew',
      scope: 'openid profile email',
      usePkce: true,
      // Refresh 60 seconds before token expires
      timeoutFactor: 0.75,  // Refresh when 75% of token lifetime has elapsed
      // Automatic silent OIDC refresh via iframe with prompt=none
      sessionChecksEnabled: true,
    });

    await this.oauthService.loadDiscoveryDocumentAndTryLogin();

    // Start automatic silent refresh — fires before token expires
    // Uses iframe with prompt=none against the OIDC issuer
    this.oauthService.setupAutomaticSilentRefresh();
  }
}

// app.module.ts — run initAuth before the app is fully initialised
export function initApp(authService: AuthService) {
  return () => authService.initAuth();
}

@NgModule({
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initApp,
      deps: [AuthService],
      multi: true  // Runs before the app bootstraps — tokens are ready before first component loads
    }
  ]
})
export class AppModule {}
```

**React — timer-based silent refresh (no OIDC provider, custom JWT auth):**
```typescript
// tokenManager.ts — manages access token lifecycle
import { useAuthStore } from './authStore';

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function parseTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch {
    return 0;
  }
}

// Call this after every successful token acquisition (login or refresh)
export function scheduleNextRefresh(accessToken: string): void {
  // Cancel any existing timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const expiry = parseTokenExpiry(accessToken);
  const now = Date.now();
  const msUntilExpiry = expiry - now;
  
  // Refresh 60 seconds before expiry (not too early, not too late)
  const refreshDelay = Math.max(msUntilExpiry - 60_000, 0);
  
  if (msUntilExpiry <= 0) {
    // Token already expired — trigger refresh immediately
    performSilentRefresh();
    return;
  }

  refreshTimer = setTimeout(performSilentRefresh, refreshDelay);
}

async function performSilentRefresh(): Promise<void> {
  try {
    // POST to refresh endpoint — browser auto-sends the HttpOnly refresh token cookie
    // withCredentials: true is required for cross-origin cookie sending
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',  // Include the HttpOnly refresh token cookie
    });

    if (!response.ok) {
      // Refresh token expired or revoked — user must re-authenticate
      useAuthStore.getState().clearToken();
      window.location.href = '/login';
      return;
    }

    const { accessToken } = await response.json();
    
    // Update the in-memory access token
    useAuthStore.getState().setAccessToken(accessToken);
    
    // Schedule the next refresh cycle
    scheduleNextRefresh(accessToken);
  } catch (error) {
    // Network error during refresh — clear auth state and force re-login
    useAuthStore.getState().clearToken();
    window.location.href = '/login';
  }
}
```

**Page reload recovery — fetching access token on startup:**
```typescript
// app.tsx or main.tsx — recover session on page reload
async function initApp(): Promise<void> {
  // Access token was in memory — gone after page reload
  // But the HttpOnly refresh token cookie is still there
  // Attempt a silent refresh to restore the session without user interaction
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',  // HttpOnly cookie — browser sends it automatically
    });

    if (response.ok) {
      const { accessToken } = await response.json();
      useAuthStore.getState().setAccessToken(accessToken);
      scheduleNextRefresh(accessToken);
      // Session restored — render the app normally
    } else {
      // Refresh token expired — user needs to log in
      // Render the login page
      useAuthStore.getState().clearToken();
    }
  } catch {
    // Network error — treat as logged out
    useAuthStore.getState().clearToken();
  }
}

// Call this before rendering the React app
initApp().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
```

**Angular HTTP interceptor — handle 401 with automatic retry after refresh:**
```typescript
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private isRefreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.accessToken;

    if (token) {
      req = this.addToken(req, token);
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !req.url.includes('/auth/refresh')) {
          // Access token expired — trigger refresh and retry the original request
          return this.handle401(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshSubject.next(null);

      return this.authService.refreshTokens().pipe(
        switchMap((newToken: string) => {
          this.isRefreshing = false;
          this.refreshSubject.next(newToken);
          // Retry the original request with the new token
          return next.handle(this.addToken(request, newToken));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          // Refresh failed — user must re-login
          this.authService.logout();
          this.router.navigate(['/login']);
          return throwError(() => err);
        })
      );
    } else {
      // Another request is already refreshing — wait for it and then retry
      return this.refreshSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => next.handle(this.addToken(request, token!)))
      );
    }
  }

  private addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }
}
```

**Spring Boot — the refresh endpoint:**
```java
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final RefreshTokenService refreshTokenService;

    @PostMapping("/refresh")
    public ResponseEntity<AccessTokenResponse> refresh(
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        // Read refresh token from HttpOnly cookie — not from request body
        // withCredentials: true in the SPA ensures the cookie is sent
        String refreshTokenValue = Arrays.stream(
            Optional.ofNullable(request.getCookies()).orElse(new Cookie[0])
        )
            .filter(c -> "refreshToken".equals(c.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No refresh token"));

        // Rotate: validate old, issue new access + refresh tokens
        TokenPair tokens = refreshTokenService.rotate(refreshTokenValue);

        // Set new refresh token in HttpOnly cookie
        Cookie refreshCookie = new Cookie("refreshToken", tokens.refreshToken());
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(true);
        refreshCookie.setPath("/api/auth");        // Only sent to /api/auth endpoints
        refreshCookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        response.addCookie(refreshCookie);

        // Return only the access token in the response body
        return ResponseEntity.ok(new AccessTokenResponse(tokens.accessToken()));
    }
}
```

> **Key decisions here:**
> - The `isRefreshing` flag and `BehaviorSubject` in the Angular interceptor handle the race condition — if 5 API calls all get 401 simultaneously, only ONE refresh request is made; the other 4 wait for the refresh result and then retry
> - Refresh token cookie `Path=/api/auth` means the browser only sends this cookie to the refresh endpoint, not to every API endpoint — limiting the cookie's exposure
> - `APP_INITIALIZER` in Angular ensures the startup token recovery completes before any component renders — prevents a flash of "logged out" state followed by "logged in" state
> - The timer approach is simpler and more predictable than iframe-based OIDC silent refresh; use iframe only when you need to respect the external OIDC provider's SSO session lifecycle

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the silent refresh pattern and why do SPAs need it?"

**Hruday's answer:**
> SPAs store access tokens in memory for security — not in localStorage, because that's XSS-readable. But in-memory storage means the token is lost on page reload. Combined with short access token expiry — say 15 minutes — you need a way to seamlessly renew tokens without interrupting the user.
>
> The silent refresh pattern solves this. On login, I parse the access token's `exp` claim and schedule a timer to fire 60 seconds before expiry. When the timer fires, the SPA makes a background call to the refresh endpoint. The browser automatically sends the `HttpOnly` refresh token cookie. The server returns a new access token. The in-memory token is updated. The timer is rescheduled. The user never sees a login prompt — the session continues seamlessly as long as they're actively using the app.
>
> On page reload, the in-memory token is gone, but the `HttpOnly` cookie persists. The SPA calls the refresh endpoint on startup before rendering anything. If successful, the session is restored invisibly. This gives users the experience of a persistent session while maintaining the security of short-lived access tokens and `HttpOnly` cookie storage.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is the `prompt=none` parameter in OIDC, and when do you use it?"

**Hruday's answer:**
> `prompt=none` is an OIDC parameter added to the authorization request that tells the identity provider: "check if the user has an active SSO session; if they do, issue new tokens silently without showing any UI; if they don't, return an error instead of the login page."
>
> This is used in the iframe-based silent refresh pattern. Your SPA creates a hidden iframe pointing to the OIDC issuer's authorization endpoint with `prompt=none`. If the user's SSO session at the identity provider is still valid — say they're logged into the corporate Google account or SAP IAS, and the session hasn't expired — the OIDC provider silently issues a new authorization code and redirects the iframe to your `silent-renew.html`. Your app extracts the new code, exchanges it for tokens, and the session continues.
>
> If the SSO session has expired — perhaps the user locked their computer for 8 hours — the provider returns `error=login_required`. Your SPA intercepts this from the iframe and redirects the main window to the login page.
>
> The key advantage over timer-based refresh is that it respects the external identity provider's session lifecycle. If an admin at the company revokes the user's SSO access, the next `prompt=none` check will return `login_required` and the user is correctly logged out — even if your 15-minute access token hasn't expired yet.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What is the race condition problem in silent refresh and how do you handle it?"

**Hruday's answer:**
> The race condition: when an access token expires, it's possible that multiple simultaneous API calls all fail with 401 at the same moment. If each 401 independently triggers a token refresh, you'd send 5 parallel refresh requests to the backend. Some of them will fail — refresh token rotation means using the same refresh token twice is detected as a security incident and invalidates all sessions.
>
> The fix is a coordinated refresh with a shared state flag. In Angular, I use an `isRefreshing` boolean and a `BehaviorSubject<string | null>`. The first 401 sets `isRefreshing = true` and starts the refresh. The other 4 simultaneous 401s check `isRefreshing`, see it's true, and subscribe to the `BehaviorSubject` waiting for the new token. When the refresh completes, the subject emits the new token. All 4 waiting requests receive it and retry with the new token.
>
> If the refresh fails — which means the refresh token itself has expired — all waiting requests emit an error, the auth state is cleared, and the user is redirected to login.
>
> This pattern ensures exactly one refresh request is in flight at any time, regardless of how many requests are failing simultaneously. It's a key implementation detail that distinguishes a production-quality auth implementation from something that breaks sporadically under normal usage.

---

### Q4 — Scenario
**Interviewer asks:** "A user opens your SPA in two tabs. They log out in Tab 1. Tab 2 still has a valid access token in memory. What happens?"

**Hruday's answer:**
> This is the multi-tab state synchronisation problem. When Tab 1 logs out, it clears its in-memory access token and deletes the refresh token cookie. Tab 2 still has its access token in memory and is unaware of the logout.
>
> Tab 2's access token will remain valid until it expires — up to 15 minutes. After that, Tab 2's silent refresh fires, posts to `/auth/refresh`, finds no refresh token cookie (deleted by Tab 1's logout), gets a 401, and redirects to the login page. So eventually Tab 2 is also logged out, just with a delay.
>
> If you need immediate cross-tab synchronisation, use the `BroadcastChannel` API or `localStorage` events. Tab 1's logout writes a "logout" event to `localStorage`. Tab 2 listens for this storage event and immediately clears its auth state and redirects to login.
>
> For most applications, the 15-minute eventual-consistency window is acceptable and not worth the added complexity. For high-security applications — banking, regulated enterprise — immediate cross-tab logout via `BroadcastChannel` is the correct choice.
>
> The important point: the `jti` Redis blocklist on the server ensures the Tab 2 access token is invalidated server-side immediately on Tab 1's logout, even if Tab 2's SPA state hasn't updated yet.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Just use localStorage for persistence" | "localStorage solves the page reload problem" | localStorage trades the page-reload UX problem for a permanent XSS vulnerability; the startup refresh call with an HttpOnly cookie solves the page-reload problem without compromise |
| No race condition handling | "Just trigger a refresh on each 401" | Multiple simultaneous 401s → multiple refresh calls → refresh token reuse detected → all sessions revoked; the isRefreshing flag + shared observable is the correct production pattern |
| Iframe cleanup | "Create an iframe, wait, done" | Iframes for OIDC silent refresh must have a timeout; if the OIDC provider is slow or down, the iframe should fail gracefully rather than hanging; the library handles this but custom implementations need explicit timeout |
| Refresh on every request | "Check if token is expired before every API call and refresh" | Synchronous expiry checks before every call add latency and can still fail if the token expires between check and use; the timer approach is proactive and eliminates expiry surprises entirely |

---

## 7. Hruday's Real Experience Hook
> "At SAP, our Angular portal used SAP IAS as the OIDC provider. I configured `angular-oauth2-oidc` with `setupAutomaticSilentRefresh()` which uses OIDC `prompt=none` via hidden iframe to renew tokens. I also implemented an `APP_INITIALIZER` that attempts token recovery on page load using the `tryLoadDiscoveryDocumentAndLogin()` method — this handles the case where a user reloads the page mid-session. For the HTTP interceptor, I implemented the coordinated 401-retry pattern with an `isRefreshing` flag and a `BehaviorSubject` to prevent multiple concurrent refresh requests. The end result: users working in the portal for hours reported zero unexpected logouts. The session monitoring dashboard showed near-zero forced re-authentications during business hours."

---

## 8. Scale Evolution

**1,000 users/day →** Timer-based silent refresh with startup recovery is sufficient. Use `angular-oauth2-oidc` or `oidc-client-ts` rather than implementing it from scratch — they've solved the edge cases (race conditions, iframe timeouts, token recovery).

**100,000 users/day →** Monitor the refresh endpoint call rate — it should be approximately (active users × 4 refreshes/hour). Any spike above this indicates token errors or a bug causing unnecessary refresh retries. Rate limit the refresh endpoint per user per minute to prevent accidental refresh loops.

**10 million users/day →** Token refresh is a coordinated traffic pattern — all users' 15-minute timers fire at different times, but there can be a large baseline refresh volume. The refresh endpoint must be lightweight: one Redis read (refresh token lookup) + one JWT generation + one Redis write (rotation). Consider edge caching for the JWKS endpoint to reduce OIDC provider load. Multi-tab state syncing via `BroadcastChannel` becomes important at scale — a user with 10 open tabs would cause 10 refresh calls without it.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment dashboard users work for full business days; a session expiry mid-transaction is critical UX/data loss; silent refresh is essential | Know the race condition handling and multi-tab logout synchronisation |
| Swiggy / Meesho | Consumer apps on mobile browsers — page reload is common; silent refresh with startup token recovery keeps session alive | Know the page reload recovery pattern using HttpOnly refresh token cookie |
| Adobe / Microsoft | Content creation tools — Creative Cloud, Office 365; users work for many hours; session continuity is a core UX requirement; enterprise SSO via OIDC `prompt=none` | Know OIDC iframe-based silent refresh and `prompt=none` semantics |
| SAP Labs | Enterprise portal users work in SAP applications all day; SAP IAS session management specific to corporate SSO policies | Know `angular-oauth2-oidc` `setupAutomaticSilentRefresh()`, `APP_INITIALIZER` token recovery pattern |

---

## 10. Related Topics — What to Study Next

- **Topic 170 — JWT deep dive** — the `exp` claim that the timer reads, the `jti` claim used in the refresh token rotation blocklist, and the RS256 signature are all directly used in the silent refresh implementation
- **Topic 171 — OAuth 2.0 flows** — the token exchange that silent refresh triggers (Authorization Code exchange or Client Credentials) is an OAuth 2.0 flow; PKCE applies to silent refresh's iframe-based approach
- **Topic 172 — OIDC** — `prompt=none` is an OIDC extension over OAuth2; understanding OIDC sessions and the discovery document is necessary for iframe-based silent refresh
- **Topic 165 — XSS** — the reason access tokens must be in memory (not localStorage) is XSS; XSS makes the silent refresh pattern necessary; XSS also makes `HttpOnly` cookies for refresh tokens necessary
- **Topic 173 → Topic 174 — Passkeys/WebAuthn** — passkeys as the authentication step that produces the initial tokens before silent refresh takes over; modern auth flow uses passkeys for initial auth, then JWT + silent refresh for session continuity

---

*Part 10 · Silent Refresh Pattern · Full Stack Interview Guide · Hruday D · 2026*
