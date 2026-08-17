# 190. Permission Modeling

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Permission modeling** is the process of designing how your application represents, stores, and evaluates what actions each user is allowed to perform on which resources. It is the foundational design decision behind your entire authorization system — get it wrong and you'll either have security gaps (too permissive) or maintenance nightmares (too granular). At its core, permission modeling answers: "What is the unit of access control?" The models range from flat flags (`isAdmin = true`) to rich predicate-based policies (`user.department === resource.department && resource.classification !== 'secret'`). Senior engineers choose the model that matches the application's access control complexity — not the model that's easiest to implement initially.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Permission Model Taxonomy

```
COARSE-GRAINED ──────────────────────────────► FINE-GRAINED

Boolean flags → Roles (RBAC) → Permissions → ABAC Policies → ReBAC

isAdmin=true    role='editor'   user:write     user.dept===doc.dept   graph-based
                                doc:delete     AND classification<='C'
```

### 1. Boolean Flags (Simplest, Very Limited)

```typescript
interface User { isAdmin: boolean; isPremium: boolean; }
// ❌ Every new access type adds another DB column
// ❌ No granularity — isAdmin = full access to everything
// ❌ Won't scale past 5-6 flags
```

### 2. Flat Role Flags

```typescript
type Role = 'admin' | 'editor' | 'viewer' | 'billing';
interface User { roles: Role[]; }
// UI check (UX only): user.roles.includes('editor')
// Better than booleans but:
// ❌ Roles must be predefined — every new business need adds a new role
// ❌ No resource-level granularity — editor can edit ALL documents or NONE
```

### 3. Permission Strings (Most Common in Modern Apps)

```typescript
// Structured as: "resource:action" or "resource:action:scope"
type Permission =
  | 'document:read'
  | 'document:write'
  | 'document:delete'
  | 'user:read'
  | 'user:invite'
  | 'billing:view'
  | 'billing:manage';

interface User {
  id: string;
  permissions: Permission[];  // assigned directly or via role
}

// Roles are just named bundles of permissions:
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  viewer: ['document:read', 'user:read'],
  editor: ['document:read', 'document:write', 'user:read'],
  admin:  ['document:read', 'document:write', 'document:delete', 'user:read', 'user:invite', 'billing:manage'],
};

// CHECK (frontend display only):
const canDelete = user.permissions.includes('document:delete');
```

### 4. Resource-Scoped Permissions

```typescript
// "Can this user edit document #456?" vs "Can this user edit any document?"
// Requires either:
//   A) Permission per resource (ACL — Access Control List)
//   B) Rule-based evaluation (ABAC)

// ACL approach:
interface DocumentACL {
  documentId: string;
  userId: string;
  permissions: ('read' | 'write' | 'delete')[];
}

// Problem: ACL at scale = O(users × documents) rows
// Solution: ABAC policies (see topic 193) or ReBAC (Google Zanzibar model)
```

### Wildcard & Hierarchical Permissions

```typescript
// Glob-style permissions — common in enterprise APIs (Casbin, AWS IAM)
const policies = [
  'document:*',         // all document actions
  'document:read',      // specific action
  'admin:users:*',      // all user admin actions
  'admin:*',            // all admin actions
  '*',                  // superadmin
];

function matches(required: string, granted: string[]): boolean {
  return granted.some(g => {
    if (g === '*') return true;
    const regex = new RegExp('^' + g.replace('*', '.*') + '$');
    return regex.test(required);
  });
}
```

### Permission Propagation Strategies

| Strategy | Description | When to Use |
|---|---|---|
| Direct assignment | Permissions assigned directly to user | Simple apps, small user base |
| Role inheritance | User has role → role has permissions | Most common; scalable to medium complexity |
| Role hierarchy | Admin role inherits all Editor permissions | Org charts, team structures |
| Permission sets (Salesforce) | Additive sets layered on base profile | Enterprise with exception overrides |
| Temporal permissions | Permissions active only between timestamps | Compliance, licensed access |

### Anti-Patterns in Permission Modeling

- **Proliferating roles**: 50 roles where 3 would do — usually symptom of not using permission sets or ABAC
- **Checking permissions client-side only**: The JavaScript `user.canDelete` check is not authorization, it's UI decoration
- **Storing permissions only in JWT**: Long-lived tokens carry stale permissions; a user's role change doesn't take effect until token expiry
- **Flat boolean flags for complex products**: `isAdmin` should be a last-resort only; structured permissions handle growth
- **String permissions with no namespace**: `'delete'` is ambiguous — `'document:delete'` is clear and namespace-safe across modules

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Salesforce:**
Uses layered permission modeling: Object-level (CRUD on any record type), Field-level (see/edit individual fields), Record-level (which records of a type), App-level (visible in the UI). Permissions are composed in layers: System Administrator Profile → Object Permissions → Permission Sets → Permission Set Groups → Manual Record Sharing. Each layer is additive — the final permission is the union of all granted permissions (most permissive wins within constraints).

**Google Workspace:**
Documents have a flat ACL: viewer, commenter, editor, owner. But at organization level, file access is governed by Drive Admin policies (Sharing settings by OU) that override individual document ACLs. This is layered authorization — both resource ACL and organizational policy are evaluated.

**SAP Fiori / Hruday's context:**
SAP authorization uses T-codes (transaction codes) and PFCG roles. An authorization object like `S_TCODE` with value `FB50` grants access to a specific transaction. This is a combination of permission strings (the T-code) and attribute checks (which organizational units). The Fiori tile catalog checks both role assignment (tile visible) and backend authorization object (action executable).

**Scaling perspective:**
- 1K users: Direct permission strings per user in DB; simple `user.permissions.includes()` lookup
- 100K users: Role-based bundles with permission sets for exceptions; cache permission evaluation
- 10M users: Policy evaluation engine (e.g., OPA — Open Policy Agent); permissions evaluated from rules, not stored per-user

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Permission modeling is the design decision that shapes your entire authorization system. I typically recommend structured permission strings over raw role names, because permissions give you fine-grained control without proliferating roles. A permission like `document:write` is composable — you can bundle it into an 'editor' role today and unbundle it into a more specific role tomorrow, without restructuring the entire model. In practice I use a three-layer system: roles as named bundles, permission sets for additive exceptions, and direct permissions for special cases. The key engineering trade-off is granularity vs performance: the finer your permissions, the more you need to evaluate per request. At scale I use a policy evaluation cache keyed by userId+resourceId+action, invalidated on permission change events. I always keep permission checks server-side; the frontend reads permission claims from the JWT only for conditional rendering, never for security enforcement."

**Likely Follow-up Questions:**
1. *How do you handle permission changes in real-time without re-login?* → Use short-lived access tokens (15 min) + server-side permission cache with event-driven invalidation on role changes
2. *What's the difference between a permission and a scope in OAuth 2.0?* → OAuth scopes are coarse-grained permission strings granted to a client application; app-level permissions are fine-grained actions granted to a user
3. *How many roles is too many?* → When roles stop being intuitive bundles and start becoming user overrides in disguise — usually 10+ roles signals you need permission sets or ABAC
4. *How do you design permissions for a multi-tenant system?* → Namespace all permissions with tenantId; enforce tenant isolation at the permission evaluation layer, not just the query layer
5. *What is the ReBAC model?* → Relationship-Based Access Control — access is derived from relationships between users and resources in a graph (Google Zanzibar model used in Drive, Docs). "User A has access to Document X because A is a member of Team B which has editor access to Folder Y which contains Document X"

**Comparison With Alternatives:**

| Model | Granularity | Scalability | Complexity | Best For |
|---|---|---|---|---|
| Boolean flags | Very low | Easy | Trivial | Proof of concepts |
| Flat roles | Low | Good | Simple | Small apps |
| Permission strings | Medium | Good | Moderate | Most production apps |
| ACL per resource | High | Poor at scale | Medium | File systems, small datasets |
| ABAC policies | Very high | Excellent | Complex | Enterprise, compliance |

**How to Explain Trade-offs Verbally:**
> "The core tension is between expressiveness and performance. Boolean flags are trivially fast to check but can't express complex business rules. ABAC policies can express any rule imaginable but require a policy evaluation engine on every request. For most applications, permission strings with role bundles hit the sweet spot — they're fast to check (array lookup), clear for developers to reason about, and flexible enough to handle complex business requirements through composition rather than proliferation."

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (Permission System in TypeScript)
────────────────────────────────────────────────────────────

```typescript
// permissions.ts — structured permission modeling

type Namespace = 'document' | 'user' | 'billing' | 'admin';
type Action = 'read' | 'write' | 'delete' | 'publish' | 'invite' | 'manage';
type Permission = `${Namespace}:${Action}`;  // Template literal type!

// Roles as named bundles of permissions
const ROLE_PERMISSIONS = {
  viewer:  ['document:read', 'user:read'] as Permission[],
  editor:  ['document:read', 'document:write', 'user:read'] as Permission[],
  admin:   ['document:read', 'document:write', 'document:delete',
             'user:read', 'user:invite', 'billing:manage'] as Permission[],
} satisfies Record<string, Permission[]>;

// User permission resolution: roles + direct overrides
function resolvePermissions(user: {
  roles: Array<keyof typeof ROLE_PERMISSIONS>;
  permissionOverrides?: Permission[];  // additive exception set
}): Set<Permission> {
  const resolved = new Set<Permission>();

  // Role-based permissions
  user.roles.forEach(role => {
    ROLE_PERMISSIONS[role].forEach(p => resolved.add(p));
  });

  // Additive permission set overrides
  user.permissionOverrides?.forEach(p => resolved.add(p));

  return resolved;
}

// React: usePermissions hook (UX only — server enforces separately)
function usePermissions() {
  const { user } = useAuth();
  const permissions = useMemo(
    () => resolvePermissions(user),
    [user.roles, user.permissionOverrides]
  );
  return {
    can: (permission: Permission) => permissions.has(permission),
    canAny: (perms: Permission[]) => perms.some(p => permissions.has(p)),
    canAll: (perms: Permission[]) => perms.every(p => permissions.has(p)),
  };
}

// Usage
function DocumentActions() {
  const { can } = usePermissions();
  return (
    <div>
      {can('document:write') && <button>Edit</button>}
      {can('document:delete') && <button>Delete</button>}  {/* UX only! */}
    </div>
  );
}
```

**Why this structure:**
- Template literal type `\`${Namespace}:${Action}\`` gives compile-time safety — typos in permission strings are caught by TypeScript
- `resolvePermissions()` is pure and testable independently of React
- `useMemo` prevents recalculating permission sets on every render
- The `can()`, `canAny()`, `canAll()` API covers the common access control patterns ergonomically

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Scale up: Flag → Role → Permission → Policy.**

As your product grows, your permission model must grow with it: boolean flags for day one, flat roles for week two, permission strings for month three, ABAC policies for year two. The progression is forced by business complexity — resist over-engineering early. Permission strings (`document:write`) are the sweet spot for most applications: composable, readable, TypeScript-safe, and fast to evaluate.

**If you go blank:** "Permission strings — `resource:action` format — bundled into roles for defaults, with additive permission sets for exceptions. Server evaluates per request; frontend reads for UI display only."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Security**: The permission model determines whether unauthorized access is architecturally impossible or just UI-hidden — getting it wrong is OWASP A01 (Broken Access Control)
→ **Maintainability**: Proliferating roles (50+ roles) or flat boolean flags make permission changes expensive and error-prone
→ **Product scalability**: A SaaS permission model must support new feature gating, enterprise customer customization, and compliance requirements — it needs to grow without re-architecture

**How it works:**
→ Permissions are structured strings (`namespace:action`) grouped into roles (named bundles). Users have roles and optional override permission sets. On each request, the server resolves the user's effective permissions, evaluates them against the required permission for the endpoint, and returns 200 or 403. The frontend reads the same permission data from the JWT payload solely for conditional rendering.

**Company relevance:**
→ **Microsoft**: Azure RBAC uses built-in and custom role definitions with action strings like `Microsoft.Compute/virtualMachines/write` — the same `namespace:action` pattern, just more verbose
→ **Adobe**: Creative Cloud enterprise plans gate features by permission strings (e.g., Generative AI credits, export resolutions) tied to license tier — direct relevance to frontend feature gating
→ **Salesforce**: Layered permission model (Profile → Permission Set → Permission Set Group) is the most complex in enterprise SaaS — interview will test depth on this
→ **Cisco**: DevNet platform uses permission strings for API scopes — understanding permission string design is directly relevant to Cisco's developer platform team
