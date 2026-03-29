# 191. Backend vs Frontend Enforcement

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Backend enforcement** means the server independently validates every request's authorization — checking roles, permissions, and ownership before processing any action or returning any data. **Frontend enforcement** means the UI conditionally shows or hides elements, guards routes, and disables actions based on the user's permission state. The critical principle is: **frontend enforcement is UX, backend enforcement is security**. Frontend authorization improves the user experience by not showing forbidden actions in the first place — but it provides zero security. Any user with browser DevTools, Postman, or curl can bypass every client-side check and call your API directly. This means every API endpoint must treat authorization as if the frontend doesn't exist — the server is the only enforcement layer that matters for security.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Why Frontend-Only Enforcement Fails

```
User opens DevTools → Application tab → Edits JWT in localStorage
Or: changes React/Angular state directly via DevTools Components panel
Or: calls API directly via curl:
  curl -X DELETE https://api.example.com/users/456 \
    -H "Authorization: Bearer <their_valid_token>"

Result: If the backend didn't check "is this user allowed to delete user 456?",
        the delete succeeds regardless of what the frontend shows.
```

This is not theoretical — it's the root cause of the majority of OWASP A01:2021 (Broken Access Control) CVEs. Real incidents include API endpoints that checked in the frontend whether the "Delete Account" button was visible, but the DELETE /users/:id endpoint only validated that the token was valid, not that the token's subject matched the account being deleted.

### Correct Layered Model

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (UX Layer)                                     │
│  ─ Hides forbidden buttons (UX only)                    │
│  ─ Blocks route navigation (UX only)                    │
│  ─ Shows "Access Denied" message                        │
│  ─ Data used: JWT claims (for display only)             │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP request (with token)
┌────────────────▼────────────────────────────────────────┐
│  BACKEND (Security Layer)                                │
│  ─ Validates token (AuthN)                              │
│  ─ Checks role/permission for this endpoint (AuthZ)     │
│  ─ Checks resource ownership (does user own this item?) │
│  ─ Applies row-level security (data scoping)            │
│  ─ Returns 401/403/200 regardless of UI state           │
│  ─ NEVER trusts: query params, headers, payload that    │
│    claim permission ("?admin=true" patterns)            │
└─────────────────────────────────────────────────────────┘
```

### The IDOR Problem (Insecure Direct Object Reference)

This is the most common authorization failure in APIs — and a pure backend enforcement failure:

```typescript
// ❌ VULNERABLE: Checks authentication only, not authorization
app.get('/api/documents/:documentId', authenticate, (req, res) => {
  const doc = await db.documents.findById(req.params.documentId);
  res.json(doc);  // ANYONE with a valid token can read ANY document!
});

// ✅ CORRECT: Checks ownership/authorization explicitly
app.get('/api/documents/:documentId', authenticate, async (req, res) => {
  const doc = await db.documents.findById(req.params.documentId);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  // Authorization check: does this user own or have access to this doc?
  const hasAccess = doc.ownerId === req.user.id
    || doc.collaborators.includes(req.user.id)
    || req.user.permissions.includes('document:read:all');

  if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });
  res.json(doc);
});
```

### What Frontend Enforcement IS Appropriate For

```
✅ Appropriate frontend-only enforcement (UX, not security):
  - Hiding Delete button when user lacks delete permission
  - Disabling form fields for read-only users
  - Not rendering Admin menu items
  - Showing "Upgrade to Pro" instead of a locked feature
  - Route guards that redirect to login for unauthenticated users

⚠️ Needs BOTH frontend AND backend enforcement:
  - Route guards (backend API must still validate)
  - Feature flags (backend must not serve restricted data)
  - Data field visibility (backend must not return hidden fields)

❌ Frontend enforcement is NEVER sufficient for:
  - Deleting / modifying resources
  - Accessing sensitive data
  - Admin actions
  - Financial transactions
  - Any operation that changes state
```

### Backend Defense in Depth

```
Request arrives
      │
      ▼
Authentication middleware   ← "Is this token valid?"
      │ Valid
      ▼
Rate limiting               ← "Is this user hammering the API?"
      │ OK
      ▼
Route-level authorization   ← "Can this role access this endpoint?"
      │ OK
      ▼
Resource-level authorization ← "Does this user own this specific resource?"
      │ OK
      ▼
Row-level security          ← "Is this data within this user's tenant/scope?"
      │ OK
      ▼
Field-level access          ← "Should salary field be included in response?"
      │
      ▼
Return response
```

### Frontend Role in the Authorization Architecture

```typescript
// Angular route guard — UX protection, not security boundary
@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  canActivate(): boolean {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }
    if (!this.permissions.can('admin:access')) {
      this.router.navigate(['/access-denied']);
      return false;  // UX: prevents rendering the admin page
      // But: the admin API endpoints MUST still check server-side
    }
    return true;
  }
}
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Facebook's 2019 Bug (IDOR):**
A backend authorization failure — authenticated users could inject other users' IDs into profile video upload endpoints and upload content to others' accounts. The frontend had no "Upload to other user's account" button — but the API didn't verify ownership.

**SAP Fiori Context:**
Fiori removes tiles from the launchpad based on PFCG roles (frontend UX). But every OData call to the SAP backend still evaluates the full authorization stack (T-codes, authorization objects, field-level). A pen tester crafting raw OData requests would still be blocked even without seeing tiles.

**LinkedIn (BOLA — Broken Object Level Authorization):**
A researcher found that changing the message thread ID in a request could expose other users' messages — the backend only checked "is this user authenticated?" not "does this user own this thread?" Classic IDOR — frontend showed no such option, but API was wide open.

**Adobe Creative Cloud:**
Free vs Pro tier gating: The frontend hides export-at-full-resolution buttons for free users. But critically, the export API endpoint also checks the user's subscription tier server-side before processing — the billing team prevents server-side bypass.

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Frontend enforcement is always UX — it improves experience by not showing forbidden actions. Backend enforcement is security — it's the only layer that actually prevents unauthorized access, because any frontend check can be bypassed with DevTools or direct API calls. I design systems so that if you deleted the entire frontend authorization layer, the backend would still correctly return 403 for every unauthorized request. In practice, this means every API endpoint has explicit authorization checks — not just authentication. The most common failure mode I've seen is what OWASP calls IDOR — Insecure Direct Object Reference — where the backend validates the token but never checks whether this user is allowed to access this particular resource. At SAP, we were meticulous about this: every OData service had both field-level and object-level authorization checks in the Fiori backend, independent of what the frontend displayed. The frontend role is limited to: hide unauthorized UI elements for UX, redirect on 401/403 as graceful error handling, and read permission claims from the JWT to make conditional rendering decisions — nothing more."

**Likely Follow-up Questions:**
1. *What is IDOR and how do you prevent it?* → Insecure Direct Object Reference — user A accesses resource B by guessing its ID. Prevent by always checking resource ownership server-side, not just token validity
2. *Isn't it redundant to check both frontend and backend?* → No — they serve different purposes. Frontend check = UX (don't show forbidden options). Backend check = security (don't execute forbidden operations)
3. *How do you handle field-level security?* → Backend strips or omits restricted fields before returning JSON response; frontend never receives them — relying on frontend to hide returned sensitive data is insufficient
4. *What if the frontend gets out of sync with backend permissions?* → Short-lived tokens (15 min) + server-side permission validation ensures eventual consistency; UI shows stale permission state at worst for 15 min, but actions are blocked immediately by server

**How to Explain Trade-offs Verbally:**
> "There's no trade-off on enforcement — backend MUST enforce, always. The design choice is around user experience: do you check permissions client-side for a smoother UX, or do you always make the API call and handle the 403 gracefully? For low-latency interactions, client-side checks before API calls improve responsiveness. For security-critical actions, I make the API call and let the server's 403 response drive the UX state — this ensures the UI always reflects real permission state, not stale cached claims."

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (IDOR Prevention + Layered Backend Check)
────────────────────────────────────────────────────────────

```typescript
// Express.js — multi-layer authorization middleware pattern

// 1. Route-level: does this role have access to this API?
function requirePermission(permission: string) {
  return (req: AuthdRequest, res: Response, next: NextFunction) => {
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// 2. Resource-level: does this user own this specific document?
async function requireDocumentAccess(
  req: AuthdRequest, res: Response, next: NextFunction
) {
  const doc = await DocumentRepository.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  const allowed =
    doc.ownerId === req.user.id           // owner
    || doc.collaborators.includes(req.user.id)   // collaborator
    || req.user.permissions.includes('document:read:all'); // admin override

  if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  req.document = doc;  // attach for downstream use
  next();
}

// Route combining both layers
router.get('/documents/:id',
  authenticate,                          // AuthN: is token valid?
  requirePermission('document:read'),    // AuthZ route-level: has this role?
  requireDocumentAccess,                 // AuthZ resource-level: owns this doc?
  (req, res) => res.json(req.document)   // safe to return
);

router.delete('/documents/:id',
  authenticate,
  requirePermission('document:delete'),  // role check
  requireDocumentAccess,                 // ownership check
  async (req, res) => {
    await DocumentRepository.delete(req.params.id);
    res.status(204).send();
  }
);

// Angular frontend — reads permission for UX only
@Component({ template: `
  <button
    *ngIf="can('document:delete')"
    (click)="delete(doc.id)">Delete</button>
  <!-- Even if this button magically appears for wrong user,
       the DELETE endpoint will return 403 -->
` })
export class DocumentComponent {
  can = this.permissions.can.bind(this.permissions);
  delete(id: string) { this.docService.delete(id).subscribe(); }
}
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"Frontend hides doors. Backend locks them."**

Hiding a door on the frontend is UX — it prevents users from accidentally finding a forbidden room. Locking the door on the backend is security — if someone finds the door handle (direct API call), it won't open. A hidden but unlocked door provides no protection. Every door must be locked regardless of whether it's visible.

**If you go blank:** "Frontend checks are UX — they hide forbidden UI. Backend checks are security — they block forbidden actions. Backend must enforce on every request as if the frontend doesn't exist. IDOR is what happens when authorization checks token validity but not resource ownership."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Security**: OWASP A01:2021 (Broken Access Control) is the #1 web vulnerability — most instances are missing backend resource-level authorization checks, not authentication checks
→ **Compliance**: GDPR Article 32, SOC 2 CC6, HIPAA each require access controls be enforced at the data layer — "we hid it in the UI" is not a valid control
→ **Defense in depth**: Backend enforcement means the application is secure even if the frontend is compromised (XSS), misconfigured, or bypassed

**How it works:**
→ The backend validates every request through a pipeline: token verification (AuthN) → role/permission check for the endpoint → resource ownership check for the specific item → field-level filtering on the response. The frontend reads the same permission data from the JWT payload purely to make conditional rendering decisions, never to gate API calls or assume the server won't check.

**Company relevance:**
→ **Microsoft**: Azure Security Center and Microsoft SDL explicitly require server-side authorization on every API endpoint — frontend middleware is insufficient per their security review checklist
→ **Adobe**: App Security team's penetration tests specifically target IDOR across Creative Cloud APIs — they actively look for resources accessible to unauthorized users
→ **Salesforce**: Every Apex controller has sharing rules enforced by the Salesforce platform at the ORM level; "without sharing" must be justified in code review — default is sharing-aware enforcement
→ **Cisco**: WebEx APIs access communication records; missing resource-level authorization on message/recording endpoints would be a serious privacy incident — their SecureX team mandates multi-layer enforcement
