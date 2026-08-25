# 189. Authentication vs Authorization

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Authentication** answers *"who are you?"* — it verifies the identity of a user or system, typically via credentials (password, biometric, token). **Authorization** answers *"what are you allowed to do?"* — it determines whether an authenticated identity has permission to perform a specific action or access a specific resource. This distinction is fundamental: authentication always comes first, but getting authorization wrong is what causes data breaches. A user can be perfectly well-authenticated (we know exactly who they are) and still access data they should never see, because the authorization check was missing, misconfigured, or silently skipped. In large-scale frontend systems, both are layered concerns — the frontend handles UX presentation of access states while enforcement must always live on the server.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Core Distinction

```
AUTHENTICATION                         AUTHORIZATION
─────────────────────────              ────────────────────────────────
Who are you?                           What can you do?
Identity verification                  Permission enforcement
Done once per session                  Done on every request/action
Result: identity token (JWT, session)  Result: allow / deny decision
Examples:                              Examples:
  - Password + MFA login               - Can user edit this document?
  - OAuth 2.0 / OIDC                   - Can user access /admin route?
  - Passkey / WebAuthn                 - Can user see this data field?
  - SSO / SAML                         - Can user call this API endpoint?
```

### Frontend Responsibilities

```
Frontend handles: PRESENTATION of access state only
  ✓ Show login form if unauthenticated
  ✓ Hide buttons/routes the user can't access (UX only)
  ✓ Display "403 Forbidden" if server returns 403
  ✓ Redirect to login on 401 Unauthorized

Frontend NEVER enforces: AUTHORIZATION
  ✗ Never skip an API call based solely on UI flag
  ✗ Never trust permissions embedded in JWT payload for rendering access alone
  ✗ Never hide UI and consider that "security"
     → A skilled attacker with DevTools can manipulate JS state
     → Server MUST enforce every permission independently
```

### Token Anatomy: Auth Data in the Wild

```typescript
// JWT payload — carries both authentication AND authorization claims
{
  "sub": "user_123",           // AUTHENTICATION — who is this user
  "email": "hr@example.com",   // AUTHENTICATION — their identity
  "iss": "https://auth.app.com", // AUTHENTICATION — who issued this
  "exp": 1699999999,           // AUTHENTICATION — token still valid?

  "roles": ["editor", "viewer"], // AUTHORIZATION — what they can do
  "permissions": ["doc:read", "doc:write"], // AUTHORIZATION — specific perms
  "tenantId": "org_456",       // AUTHORIZATION — which data scope
}
// JWT verifies identity (authentication) + carries claims for authorization checks
// BUT: server validates these claims on EVERY request — never trust client-side only
```

### The 401 vs 403 Distinction

| Code | Meaning | Frontend Action |
|---|---|---|
| 401 Unauthorized | Not authenticated (identity unknown) | Redirect to login |
| 403 Forbidden | Authenticated but not authorized | Show access denied UI; do NOT redirect to login |

```typescript
// Axios interceptor distinguishing auth vs authz failures
axiosInstance.interceptors.response.use(null, (error: AxiosError) => {
  switch (error.response?.status) {
    case 401:
      // Token expired or missing — re-authenticate
      router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      break;
    case 403:
      // Authenticated but forbidden — show access denied, not login
      router.navigate(['/access-denied']);
      break;
  }
  return Promise.reject(error);
});
```

### Common Architecture Patterns

```
Browser ─── Request + Token ──► API Gateway
                                    │
                       AuthN: Is token valid? (JWT verify)
                                    │ Yes
                       AuthZ: Does this role permit POST /admin/users?
                                    │ Yes
                              Controller Logic
```

The gateway or middleware validates identity (AuthN) once. Authorization (AuthZ) is checked per resource — often at multiple layers (Gateway → Service → ORM row-level).

### Anti-Patterns

- **Using 401 for authorization failures** — confuses clients; they'll redirect to login when the user just doesn't have permission
- **Frontend-only permission checks** — adding `v-if="user.isAdmin"` without a server-side check on the API; the backend endpoint is left unguarded
- **Over-loading authentication tokens with authorization state** — putting every permission in the JWT makes the token massive and any permission change requires re-login
- **Mixing concerns in a single `auth` service** — AuthN and AuthZ logic should be separate services/modules for clarity and testability

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Salesforce:**
Salesforce CRM has one of the most sophisticated AuthZ systems in enterprise software. Authentication is via OAuth 2.0 / SSO. Authorization is a layered system: Organization-level permissions → Profile-level permissions → Permission Set overrides → Record-level sharing rules → Field-level security. A user authenticates once (AuthN) but every single Apex controller call, every LWC data fetch, is independently checked against all authorization layers. Frontend shows/hides fields via `@wire` service — but the Apex backend re-checks field-level security before returning data.

**Microsoft Teams:**
You authenticate once via Azure AD (MSAL). Authorization is then handled by: tenant admin policies (can you use Teams?), team membership (can you see this channel?), file permissions (SharePoint OAuth scope), app permissions (can this Teams Tab app read your calendar?). A user who is perfectly authenticated can still get 403 on a Teams channel they're not a member of.

**SAP Fiori / Hruday's context:**
SAPUI5 apps authenticate via SAP Identity Provider (OAuth/SAML SSO). Authorization is handled by SAP backend roles (T-code based, PFCG roles). The Fiori frontend shows/hides tiles on the launchpad based on role assignments — but every OData service call validates authorization independently server-side. The frontend's tile visibility is a courtesy UX — not the security boundary.

**Failing to separate them:**
A common CVE pattern: app performs authentication (valid JWT check) but the server endpoint for `/api/admin/users` only checks `if (req.user)` (authenticated) rather than `if (req.user?.role === 'admin')` (authorized) — every authenticated user can access admin endpoints.

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Authentication and authorization are frequently conflated but solve fundamentally different problems. Authentication verifies identity — it answers 'who is this?' typically via a credential that's exchanged for a session token or JWT. Authorization verifies permission — it answers 'can this identity perform this action?' and is evaluated on every request. In frontend systems, this manifests as: authentication drives whether you see a login screen or a dashboard, while authorization drives whether specific buttons are visible, routes are accessible, and API calls succeed. The critical nuance is that frontend authorization — hiding a button, protecting a route guard — is purely UX, never security. A user with DevTools can manipulate any client-side state. All authorization must be enforced server-side, and I design every system so the server would block the action even if the frontend never hid the UI element. At the HTTP level, 401 means 'not authenticated — go log in,' while 403 means 'authenticated but forbidden — go away, logging in won't help.' Getting this wrong at the interceptor layer causes a frustrating redirect loop."

**Likely Follow-up Questions:**
1. *Can you store authorization data in a JWT?* → Yes — roles/permissions as claims; but the server must validate every request against them, not just the frontend reading them from the token
2. *What's the difference between 401 and 403?* → 401: identity unknown, login may help; 403: identity known, permission denied, login won't help
3. *Can I trust the user's role from the JWT without backend validation?* → No — for UX presentation only; backend must independently check the role on every privileged action
4. *How do you handle authorization in a micro-frontend architecture?* → Centralize auth token management; each MFE reads permissions from a shared auth store; each MFE's BFF (Backend for Frontend) validates server-side
5. *What is OIDC and how does it relate to authorization?* → OIDC is an authentication protocol built on OAuth 2.0; OAuth 2.0 itself is originally an authorization framework — together they provide both identity tokens (OIDC) and access scopes (OAuth)

**Comparison With Alternatives:**

| System | Auth Mechanism | AuthZ Mechanism |
|---|---|---|
| Traditional session | Username + password → server session | Session-stored role, DB lookup on request |
| JWT-based | Credentials → signed JWT | JWT claims; server re-validates on each request |
| OAuth 2.0 | Authorization code → access token | Scopes in access token; resource server validates |
| API Key | API key in header | Key-to-permission mapping in DB |
| Certificate (mTLS) | Client cert → verified identity | Server policy maps cert to allowed actions |

**How to Explain Trade-offs Verbally:**
> "The key engineering trade-off is where to store authorization state: in the token (stateless, fast, but stale until expiry) or in a server-side lookup (real-time accuracy, but DB round-trip per request). For most applications, I embed roles in the JWT for speed and use short token expiry (15 minutes) to limit the staleness window. For high-security scenarios where permissions change frequently — like Salesforce with live permission sets or enterprise role changes — I supplement with a server-side permission cache that's invalidated on role change, giving real-time precision without burning DB queries on every request."

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (Auth vs AuthZ in Angular Service)
────────────────────────────────────────────────────────────

```typescript
// auth.service.ts — separation of authentication and authorization concerns

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser$ = new BehaviorSubject<User | null>(null);

  // AUTHENTICATION — who is the user?
  isAuthenticated(): boolean {
    return this.currentUser$.value !== null;
  }

  getIdentity(): User | null {
    return this.currentUser$.value;
  }

  async login(credentials: LoginCredentials): Promise<void> {
    const { user, accessToken } = await this.authApi.login(credentials);
    this.tokenStore.setAccessToken(accessToken);
    this.currentUser$.next(user);
  }

  logout(): void {
    this.tokenStore.clear();
    this.currentUser$.next(null);
    this.router.navigate(['/login']);
  }
}

// SEPARATE service for authorization — different concern
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  constructor(private authService: AuthService) {}

  // AUTHORIZATION — what can they do?
  can(permission: string): boolean {
    const user = this.authService.getIdentity();
    if (!user) return false;  // no auth = no authz
    // Read permissions from token claims — for DISPLAY only
    return user.permissions.includes(permission);
  }

  hasRole(role: string): boolean {
    return this.authService.getIdentity()?.roles?.includes(role) ?? false;
  }
}

// Usage in component — correct separation
@Component({ template: `
  <!-- AuthN check -->
  <ng-container *ngIf="auth.isAuthenticated(); else loginPrompt">

    <!-- AuthZ check — UX only, server enforces independently -->
    <button *ngIf="permissions.can('user:delete')"
            (click)="deleteUser()">Delete User</button>

  </ng-container>
` })
export class UserActionsComponent {
  constructor(
    public auth: AuthService,
    public permissions: PermissionsService
  ) {}
}
```

**Why this structure:**
- `AuthService` owns identity only; `PermissionsService` owns capability decisions — separated by single responsibility
- `PermissionsService.can()` reads from the JWT payload for UI rendering — the server still validates on every API call
- The component template shows the 401/403 differentiation in practice: isAuthenticated drives top-level visibility; can() drives action-level visibility

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"AuthN = passport, AuthZ = visa."**

Your passport (AuthN) proves who you are. Your visa (AuthZ) specifies which countries you can enter and what you can do there. You need a valid passport first; then each country (resource) checks your visa independently. The airport (frontend) shows which counters you can use (UX) — but the immigration officer (server) still stamps the visa, regardless of which counter you arrived at.

**If you go blank:** "Authentication is identity — who you are. Authorization is permission — what you can do. 401 = not authenticated. 403 = not authorized. Frontend hides UI as UX only; server enforces authorization on every request."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Security**: The majority of OWASP A01:2021 (Broken Access Control) vulnerabilities come from treating authentication as sufficient and skipping authorization checks on sensitive endpoints
→ **UX**: Returning 401 for a 403 scenario causes login redirect loops that frustrate users; correct HTTP semantics enable correct error messaging
→ **Architecture**: Separating AuthN and AuthZ services enables them to evolve independently — you can swap from password auth to passkeys without changing permission logic

**How it works:**
→ Authentication verifies the identity token (JWT signature, session lookup) on every request. Authorization reads the identity's claims (roles, permissions) and compares against the resource's access policy. The frontend reads auth state for routing decisions and reads permissions for conditional rendering — but both are re-verified server-side independently of anything the frontend does.

**Company relevance:**
→ **Microsoft**: Azure AD handles AuthN globally; every Azure service enforces AuthZ independently via RBAC policies — interviewers expect you to know this layered model cold
→ **Adobe**: Creative Cloud mixes free tier vs paid tier permissions — AuthZ drives feature gating (can they export at full resolution?); conflating this with AuthN is a classic mistake
→ **Salesforce**: Their AuthZ model (profiles, permission sets, sharing rules, field-level security) is among the most complex in enterprise software — they will test whether you understand the layers
→ **Cisco**: WebEx and DevNet APIs use OAuth scopes heavily (AuthZ) — interviewers expect fluency with scope-based access control
