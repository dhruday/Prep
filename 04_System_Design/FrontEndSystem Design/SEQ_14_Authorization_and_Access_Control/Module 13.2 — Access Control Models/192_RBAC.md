# 192. Role-Based Access Control (RBAC)

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Role-Based Access Control (RBAC)** is the most widely used authorization model, where permissions are assigned to roles rather than directly to individual users. Users are assigned one or more roles, and their access is the union of all permissions granted to those roles. RBAC simplifies permission management at scale — instead of managing permissions for 10,000 individual users, you manage 10–20 roles, and users inherit permissions by role membership. It maps naturally to organizational structures: an "Editor" can create and modify content, a "Viewer" can only read, an "Admin" can do everything. RBAC is the default model in most enterprise software — Azure RBAC, AWS IAM roles, Salesforce Profiles — and the right starting point for most production applications before complexity demands attribute-based policies.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Core RBAC Model (NIST Models 0–3)

```
RBAC0 (Core)        Users → Roles → Permissions     Basic flat model
RBAC1 (Hierarchical) Roles inherit from other roles  Admin ⊃ Editor ⊃ Viewer
RBAC2 (Constrained)  Separation of duty constraints  Can't be both Auditor + Finance
RBAC3 (Symmetric)    RBAC1 + RBAC2 combined          Enterprise compliance
```

### RBAC1 — Role Hierarchy (Most Common in Production)

```
                    Admin
                   /  |  \
              Editor  Finance  Support
               /  \
           Writer  Reviewer
               \  /
              Viewer

Admin inherits ALL permissions from all child roles.
Finance has billing:*, user:read - cannot edit content.
Support has ticket:*, user:read - cannot access finance.
Separation of Duty: Finance role and Auditor role cannot be
  assigned to the same user simultaneously (RBAC2 constraint).
```

### RBAC Data Model

```typescript
// Normalized RBAC schema (database tables)
interface Role {
  id: string;
  name: 'admin' | 'editor' | 'viewer' | 'billing' | 'support';
  parentRoleId?: string;  // for hierarchy
  permissions: Permission[];
}

interface UserRoleAssignment {
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;        // temporal RBAC — access expires automatically
  scope?: string;          // scoped RBAC — "editor" of specific namespace only
}

// Effective permission resolution with role hierarchy
async function getEffectivePermissions(userId: string): Promise<Set<Permission>> {
  const assignments = await db.userRoles.findByUserId(userId);
  const permissions = new Set<Permission>();

  for (const assignment of assignments) {
    const roleTree = await buildRoleTree(assignment.roleId);
    roleTree.forEach(role => role.permissions.forEach(p => permissions.add(p)));
  }
  return permissions;
}

// Role tree traversal (BFS for hierarchy)
async function buildRoleTree(roleId: string): Promise<Role[]> {
  const roles: Role[] = [];
  const queue = [roleId];
  while (queue.length) {
    const currentId = queue.shift()!;
    const role = await db.roles.findById(currentId);
    if (!role) continue;
    roles.push(role);
    if (role.parentRoleId) queue.push(role.parentRoleId);
  }
  return roles;
}
```

### RBAC in the Frontend

```typescript
// Angular: role-based directive for conditional rendering
@Directive({ selector: '[appRequireRole]' })
export class RequireRoleDirective {
  @Input() set appRequireRole(roles: string | string[]) {
    const required = Array.isArray(roles) ? roles : [roles];
    const userRoles = this.auth.getIdentity()?.roles ?? [];
    const hasRole = required.some(r => userRoles.includes(r));

    if (hasRole) {
      this.viewRef = this.vcRef.createEmbeddedView(this.templateRef);
    } else {
      this.vcRef.clear();
      this.viewRef = null;
    }
  }
}

// Usage in template (UX only — server enforces too):
<button *appRequireRole="'admin'">Delete User</button>
<div *appRequireRole="['editor', 'admin']">Edit Panel</div>
```

### RBAC Caching Strategy

```
User logs in → roles fetched from DB → embedded in JWT
Each API request → roles read from JWT (no DB lookup needed)
Permission change → short JWT expiry (15 min) bounds stale window
Admin revokes role immediately → permission cache invalidated via event

// For real-time role revocation: Redis cache pattern
// GET /api/users/:id/effective-permissions → cached in Redis
// On role change event → INVALIDATE Redis key for that userId
// Next request → cache miss → re-reads from DB
```

### Anti-Patterns in RBAC

- **Role proliferation**: Creating `admin-europe`, `admin-usa`, `admin-apac` instead of using scoped RBAC or ABAC for regional access — leads to 50+ nearly-identical roles
- **Monolithic admin role**: Single God-mode "admin" role with all permissions — violates principle of least privilege; use function-specific admin roles (`user-manager`, `content-admin`, `billing-admin`)
- **Permission assignment to users directly**: Bypassing roles for individuals creates an unmaintainable maze; use permission sets (additive overrides) instead
- **No role expiry**: Access persists after an employee leaves a project — add `expiresAt` to role assignments for contractors and temporary access
- **Deep role hierarchies**: >3 levels of inheritance makes debugging "why does user X have this permission?" extremely difficult

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Azure RBAC:**
Azure uses RBAC with built-in roles (Owner, Contributor, Reader) and custom role definitions. Role assignments have scope (Tenant → Subscription → Resource Group → Resource). A user can be a Contributor at the Resource Group level and a Reader at the Subscription level — RBAC1 hierarchy + scoped assignments. This is the production RBAC model Hruday will encounter at Microsoft.

**Salesforce Profiles (RBAC baseline):**
Every Salesforce user has exactly one Profile (their base role). Profiles define object-level CRUD, field-level visibility, and app access. This is flat RBAC0. Permission Sets (topic 201) are then layered on top for additive exceptions — Salesforce's evolution from pure RBAC toward something closer to permission sets.

**SAP Authorization (Hruday's context):**
SAP uses PFCG roles which are hierarchical RBAC. A role contains authorization objects and values — effectively permission strings in SAP's namespace. Composite roles contain child roles. The Fiori launchpad shows/hides tiles based on role assignments, while every OData backend call validates the role's authorization objects server-side.

**GitHub Teams:**
GitHub uses RBAC with team-based roles: Read, Triage, Write, Maintain, Admin — per repository. A user can have Read on repo A and Write on repo B. This is scoped RBAC at the repository level.

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "RBAC is my default authorization model — you assign permissions to roles and users inherit access via role membership. Its killer feature is management scalability: instead of auditing permissions for 50,000 users, you audit 15 roles. In production I implement RBAC1 — hierarchical roles — where an Admin inherits all Editor permissions which inherit all Viewer permissions. This maps naturally to organizational hierarchies and prevents role explosion from duplicating permissions across levels. For enterprise systems, I layer permission sets on top of base roles — roles define the default access floor, permission sets are additive exceptions for edge cases. The frontend reads roles from the JWT payload for conditional rendering — hiding forbidden UI elements. The backend re-validates on every request via middleware that checks the role against a permission map, then checks resource ownership to prevent IDOR. The key RBAC limitation is coarse-grained resource access — if you need 'user can edit documents in their department but not others', RBAC alone can't express that; you need ABAC predicates."

**Likely Follow-up Questions:**
1. *When does RBAC break down and you need ABAC?* → When permissions depend on attributes of the resource or context, not just user's role: "can edit only their own department's data", "can approve amounts below their limit"
2. *How do you handle a user who needs a one-off permission?* → Permission sets: additive exceptions layered on the user's base role, avoiding role proliferation
3. *What's role explosion and how do you prevent it?* → Too many specific roles instead of composing from base roles + permission sets; prevent with a role consolidation review process
4. *How do you implement scoped RBAC?* → Add scope to role assignment: `userId:editor:namespace:org-123` — user is editor only within org-123's resources
5. *What's Separation of Duty and when is it needed?* → RBAC2 constraint: certain role combinations are forbidden (e.g., a user can't be both Finance-Approver and Finance-Requester — prevents fraud). Required in SOC 2, HIPAA, financial systems

**Comparison Table:**

| RBAC Level | Feature | Use Case |
|---|---|---|
| RBAC0 (Core) | Users → Roles → Permissions | Most web apps |
| RBAC1 (Hierarchical) | Roles inherit from parent roles | Org-chart-like structures |
| RBAC2 (Constrained) | Separation of duty rules | Finance, compliance systems |
| RBAC3 (Symmetric) | Hierarchy + Constraints | Enterprise ERP systems |

**How to Explain Trade-offs Verbally:**
> "RBAC is excellent for stable access patterns — if your access requirements can be expressed as 'users in role X can do Y', RBAC scales beautifully and is easy to audit. It struggles when access depends on runtime context or data attributes — 'user can only edit records from their region' can't be expressed as a static permission bundle. That's the boundary where I'd reach for ABAC predicates, while keeping RBAC as the base layer for coarse-grained role checks."

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (RBAC with Hierarchy in TypeScript)
────────────────────────────────────────────────────────────

```typescript
// rbac.ts — hierarchical RBAC implementation

type Permission = `${string}:${string}`;

const ROLES: Record<string, { permissions: Permission[]; inherits?: string }> = {
  viewer:  { permissions: ['document:read', 'user:read'] },
  editor:  { permissions: ['document:write', 'document:publish'], inherits: 'viewer' },
  admin:   { permissions: ['user:invite', 'user:delete', 'billing:manage'], inherits: 'editor' },
  billing: { permissions: ['billing:manage', 'billing:view'], inherits: 'viewer' },
};

// Resolve effective permissions including inherited roles
function resolveRolePermissions(roleName: string, visited = new Set<string>()): Set<Permission> {
  if (visited.has(roleName)) return new Set();  // prevent circular inheritance
  visited.add(roleName);

  const role = ROLES[roleName];
  if (!role) return new Set();

  const permissions = new Set<Permission>(role.permissions);

  if (role.inherits) {
    // Inherit parent role permissions
    resolveRolePermissions(role.inherits, visited).forEach(p => permissions.add(p));
  }
  return permissions;
}

// User permission evaluation
function userCan(userRoles: string[], permission: Permission): boolean {
  return userRoles.some(role => resolveRolePermissions(role).has(permission));
}

// Test:
// editor inherits viewer: userCan(['editor'], 'document:read') → true
// admin inherits editor → viewer: userCan(['admin'], 'document:read') → true
// billing doesn't inherit editor: userCan(['billing'], 'document:write') → false

// React: hook using the same resolution logic
function useRBAC() {
  const { user } = useAuth();
  return {
    hasRole: (role: string) => user.roles.includes(role),
    can: (permission: Permission) => userCan(user.roles, permission),
  };
}
```

**Why this structure:**
- `visited` set prevents infinite loops in circular role definitions
- Single `resolveRolePermissions()` function handles all levels of hierarchy — no separate code for each depth
- The resolution is pure (no side effects) → easily testable and cacheable
- `userCan()` is the single function used for both frontend display and server-side route checks

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"RBAC = Job title system. Permissions come with the title, not the person."**

An Editor's job title comes with: create, edit, publish permissions. A Viewer's title comes with: read permission. Promoting someone to Admin gives them all Editor + Viewer permissions plus admin actions — inheritance. The HR department (your authorization system) manages titles; individuals don't get custom permissions unless via a "special exception" (permission set).

**If you go blank:** "RBAC assigns permissions to roles; users get permissions via role membership. Use RBAC1 hierarchy so Admin inherits Editor which inherits Viewer — avoids permission duplication. Frontend reads roles for conditional rendering; backend validates roles on every request. Role explosion = too many roles — prevent with permission sets."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Auditability**: Compliance audits require proving who had access to what, when — RBAC's explicit role assignments make this tractable
→ **Least privilege**: Roles can be designed with minimal permissions and expanded via sets — supports zero-trust security postures
→ **Operational scale**: Managing 20 roles is feasible; managing permissions for 50,000 individual users is not

**How it works:**
→ Permissions are assigned to role objects in the database or configuration. Users are assigned roles via an assignment table. When evaluating access, the system traverses the user's roles (and their inherited parents), collects the union of all permissions, and checks whether the required permission is in that set. The frontend reads role claims from the JWT for UI rendering; the backend re-evaluates role permissions per request from the server's authoritative role definition.

**Company relevance:**
→ **Microsoft**: Azure RBAC is their enterprise gold standard — interviewers at Microsoft expect fluency with hierarchical roles, scope-based assignment, and least-privilege design
→ **Adobe**: Creative Cloud's team/enterprise plan gating is built on RBAC — team admins, members, guests with defined permission tiers per product module
→ **Salesforce**: Profiles (RBAC baseline) + Permission Sets (overrides) is their layered RBAC model — deep knowledge expected for Salesforce interview
→ **Cisco**: Cisco's DevNet portal, SecureX, and WebEx admin console all use RBAC for organization member management — role-based team access is a core interview topic
