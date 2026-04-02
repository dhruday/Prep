# 200 – Privilege Escalation Prevention

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Privilege escalation is when a user gains more permissions than they are authorized to have — either by exploiting application code (vertical escalation: gaining admin from user), or by accessing another user's resources at the same privilege level (horizontal escalation, which overlaps with IDOR). Prevention requires **boundary enforcement**: users can never assign themselves roles higher than they currently possess, role assignment requires admin-level authorization, all privilege operations are logged, and the principle of least privilege is applied so users start with minimum permissions and must be explicitly elevated. The core rule: **the server, not the client, determines what permissions a user has** — any client-submitted permission claim is ignored unless independently verified.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Types of Privilege Escalation

```
Vertical escalation:    User → Admin  (gain higher privilege)
Horizontal escalation:  User A's data accessed by User B (same level, cross-user)
Temporal escalation:    User retains permissions after they should have expired
```

### Attack Vectors

| Vector | Example | Prevention |
|---|---|---|
| Mass assignment | `PUT /user { role: "admin" }` accepted | Allowlist updatable fields; never bind role from client |
| JWT tampering | Modify role claim in JWT | Verify JWT signature; reject unsigned tokens |
| Insecure direct role assignment | `POST /roles/assign { userId, role: "admin" }` without auth | Require admin+ to assign any role |
| Permission inheritance abuse | Child role grants more than parent | Validate role hierarchy on assignment |
| Token replay | Old token reused after demotion | Implement token revocation / short expiry |
| Frontend bypass | Change `user.role` in localStorage | Never trust client-sent role — verify from token |

### Key Prevention Patterns

**1. Role assignment authority check**
```typescript
// Can only assign roles AT OR BELOW your own level
if (requestor.roleLevel < targetRole.level) {
  throw new ForbiddenException('Cannot assign role higher than your own');
}
```

**2. Mass assignment prevention**
```typescript
// Explicitly allowlist updatable fields
class UpdateUserDto {
  @IsString() @IsOptional() displayName?: string;
  @IsString() @IsOptional() profilePicture?: string;
  // role, permissions — NOT in this DTO (admin-only endpoint)
}
```

**3. Forced re-authentication for sensitive escalation**
```typescript
// Elevate to sensitive operation: require fresh credential
if (action.isSensitive && token.age > 5 * 60) {
  throw new StepUpAuthRequired(); // 401 with WWW-Authenticate: StepUp
}
```

**4. Time-bounded privilege elevation (temporary admin)**
```typescript
interface ElevationGrant {
  grantedTo: string;
  role: 'admin';
  expiresAt: Date;    // Never permanent
  grantedBy: string;  // Auditable
  reason: string;     // Required justification
}
```

### The Confused Deputy Problem

A dependent service acting with higher privilege than the user should have:

```
User (viewer) → UI → API (no re-check) → Service (admin level) → Database
                                                                   ↑ escalation!
Prevention: Pass user context (userId + permissions) through all service calls.
Every service independently enforces its own authorization.
```

### Anti-Patterns

- ❌ Client sends `role: "admin"` in body and server uses it without verification
- ❌ Bulk update endpoint that lets users change their own role
- ❌ Role assignment without logging who approved and when
- ❌ Permanent privilege elevation (all sensitive escalations should be time-bounded)
- ❌ Forgetting to revoke permissions when a user's role changes (stale token problem)

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG-Scale: GitHub Teams Privilege Model

GitHub enforces role hierarchy strictly: only organization owners can assign organization roles. Repository admins can add collaborators only up to their own permission level — they cannot grant higher access than they themselves possess. Every permission change is logged in the organization audit log with actor, target, action, and timestamp.

### FAANG-Scale: AWS IAM Boundary

AWS IAM uses permission boundaries — even if an IAM policy grants `*`, a permission boundary restricts the maximum effective permissions. This prevents an admin user from creating a new IAM user with higher privileges than themselves (escalation prevention by design). The `sts:AssumeRole` action with condition keys further restricts which roles can be assumed.

### Hruday @ SAP Labs — BTP Authorization

At SAP, we had a strict role assignment policy enforced in code: only users with the `UserAdmin:write` scope could invoke role assignment APIs. We additionally prevented mass assignment through strict DTO allowlisting — the User update endpoint only accepted `displayName`, `locale`, and `profilePicture`. Any attempt to submit `role` or `authorities` in the body was silently ignored due to `excludeExtraneousValues: true` in class-transformer. Role assignment created an immutable audit record before the change took effect.

### Hruday @ Bosch — IoT Device Admin Escalation

At Bosch, device admin escalation required step-up authentication: the user had to re-authenticate with SAML before accessing device admin functions. The JWT contained a `aml` (authentication methods) claim — we required this claim to include `urn:oasis:names:tc:SAML:2.0:ac:classes:Password` with an `auth_time` within the last 5 minutes for sensitive operations.

### Scaling:

At 10M users, token revocation lists (Redis cache of revoked JTIs) become critical: when a user loses a role, all existing tokens must be invalidated. Implement JWT introspection endpoint (or short-lived tokens + refresh rotation) to minimize the window between role removal and access termination.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Privilege escalation comes in two forms: vertical (gaining higher privileges) and horizontal (accessing another user's same-level resources). The most common vulnerability I've seen is mass assignment — where a client submits a role field in a user update payload and the server binds it without validation.*

*My prevention strategy has three pillars: (1) never trust client-submitted roles — all permissions come from the verified JWT or server-side lookup; (2) role assignment requires explicit authorization from a user with higher or equal privilege, enforced in the assignment endpoint; (3) sensitive operations require step-up authentication — a fresh credential challenge before execution.*

*At SAP, I used `excludeExtraneousValues: true` in class-transformer so any `role` or `permissions` field submitted in a user update payload was silently dropped before reaching the service layer. Role changes created an immutable audit record before the change took effect. I also enforced short JWT lifetimes (15 minutes) so that a revoked role took effect quickly without needing a complex token blacklist."*

### Follow-up Questions

1. **"How do you prevent mass assignment of roles?"** — DTO allowlisting: only expose fields the user is allowed to change. Role/permission fields live in a separate admin-only endpoint.
2. **"What's the confused deputy problem?"** — A service acting on behalf of a user but with higher privileges than the user should have. Fix: propagate user context through all service-to-service calls; each service independently authorizes.
3. **"How do you handle stale permissions after a role revocation?"** — Short JWT expiry (15 min) + refresh token rotation. Or: Redis token blacklist + JWT introspection per request.
4. **"What is step-up authentication?"** — Requiring the user to re-prove their identity (TOTP, re-enter password) before a sensitive action, even though they're already logged in. Used for financial transactions, settings changes, role escalation.
5. **"Why should privilege elevation always be time-bounded?"** — Permanent elevation accumulates over time (privilege creep). Time-bounded elevation forces explicit re-justification. Reduces blast radius if credentials are compromised.

### Comparison Table

| Attack | Mechanism | Prevention |
|---|---|---|
| Mass assignment | Client sends role in update body | DTO allowlist + excludeExtraneousValues |
| JWT role tampering | Modify role in JWT payload | RS256 signature verification |
| Role self-assignment | User calls role assignment API | API requires admin+ authorization |
| Confused deputy | Service uses elevated context | Propagate user claims through services |
| Stale permissions | Token still valid after role removal | Short expiry + token revocation list |

### Trade-offs

- Short JWT expiry reduces stale permission window but increases refresh token traffic — balance at 15-minute access token + 24h refresh
- Redis JTI blocklist enables instant revocation but adds latency per request — use async bloom filter for read performance
- Step-up auth adds friction for sensitive operations but prevents ATO (account takeover) exploitation

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// 1. DTO allowlisting — mass assignment prevention
class UpdateUserDto {
  @IsString() @IsOptional() @MaxLength(50)
  displayName?: string;

  @IsUrl() @IsOptional()
  avatarUrl?: string;

  // role, permissions, tenantId — NOT here
  // Admin-only: separate PatchUserAdminDto with stricter guards
}

// 2. Role assignment — authority boundary check
@Post('/users/:id/roles')
@UseGuards(JwtAuthGuard, RoleGuard('admin'))
async assignRole(
  @Param('id', ParseUUIDPipe) targetUserId: string,
  @Body() dto: AssignRoleDto,
  @CurrentUser() requestor: AuthUser
): Promise<void> {
  const targetRole = await this.roleService.findByName(dto.role);

  // Cannot assign a role higher than your own level
  if (requestor.roleLevel < targetRole.level) {
    throw new ForbiddenException(
      'Cannot assign role exceeding your own privilege level'
    );
  }

  // Immutable audit record BEFORE making the change
  await this.auditService.log({
    action: 'role:assign',
    targetUserId,
    role: dto.role,
    grantedBy: requestor.id,
    grantedAt: new Date()
  });

  await this.userService.assignRole(targetUserId, dto.role);

  // Revoke existing tokens to force re-login with new permissions
  await this.tokenService.revokeAllForUser(targetUserId);
}

// 3. Step-up authentication guard
@Injectable()
export class StepUpGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const token = req.jwtPayload;

    const tokenAge = (Date.now() - token.iat * 1000) / 1000;
    const requiredMethods = req.route.data?.requiredAuthMethods ?? [];

    const methodsPresent = requiredMethods.every(
      (m: string) => token.amr?.includes(m)
    );

    if (!methodsPresent || tokenAge > 5 * 60) {
      throw new HttpException(
        { error: 'step_up_required', action: req.path },
        HttpStatus.UNAUTHORIZED
      );
    }
    return true;
  }
}

// 4. Guard against confused deputy pattern
// Propagate user context in service-to-service calls
interface ServiceCallContext {
  callerService: string;
  actingAsUser: { id: string; permissions: string[]; tenantId: string; };
}

// Each downstream service checks actingAsUser.permissions, not service identity
async function processInvoice(ctx: ServiceCallContext, invoiceId: string) {
  if (!ctx.actingAsUser.permissions.includes('invoice:process')) {
    throw new ForbiddenException('User lacks invoice:process permission');
  }
  // ...
}
```

**Why this structure:**
- DTO allowlisting prevents mass assignment without complex per-field validation
- Audit log written before role change — ensures the intent is captured even if assignment fails
- `revokeAllForUser` invalidates stale tokens immediately after role change
- `StepUpGuard` uses `iat` (issued-at) claim for token age check — no extra service call

**Interviewer focus:** DTO allowlisting, role level boundary check, step-up auth, audit-before-change

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Roles go up only through authority, never by request."** Three attackable vectors: (1) mass assignment — user submits `role: "admin"` in body; (2) JWT tampering — user edits role claim; (3) self role-assignment — user calls assignment API directly. Prevention: DTO allowlist + signature verification + assignment requires existing privilege. All role changes are audit-logged before they happen. Step-up auth adds a fresh credential challenge for sensitive escalations. Short JWT expiry (15 min) limits the damage window of stale tokens.

*If you go blank*: "Prevent mass assignment with DTO allowlist. Role assignment requires equal/higher authority. Always audit role changes. Short token expiry removes stale permissions."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
- Mass assignment of roles (e.g., `role: "admin"` in a PUT body) is a trivially exploitable vulnerability that requires only one HTTP call with modified JSON
- Stale permissions (user has token with high-privilege role after demotion) can persist for hours with long-lived JWTs — a major enterprise security risk
- Privilege escalation is how breaches go from "limited access" to "full system compromise" — it's the difference between a data breach and a catastrophic one

**How it works:**
Backend DTOs explicitly allowlist updatable fields. Role assignment endpoints require the requestor to have a role level equal to or higher than the role being assigned, checked server-side. JWT signatures (RS256) are verified on every request to prevent token tampering. All privilege changes create an immutable audit record before taking effect, and existing tokens are invalidated to prevent stale access.

**Company-specific relevance:**
- **Microsoft**: Azure AD's privileged identity management (PIM) is a production system for time-bounded, step-up-authenticated privilege elevation — the gold standard
- **Adobe**: Creative Cloud admin consoles enforce role assignment authority: only organization admins can create other organization admins
- **Salesforce**: The permission sets model and the "Salesforce Profiles" hierarchy enforce privilege boundaries — no user can grant permissions beyond what their Profile allows
- **Cisco**: DNA Center enforces role-based access with "role prerequisite" constraints — a site admin cannot create a network admin because it would be a privilege escalation
