# 193. Attribute-Based Access Control (ABAC)

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Attribute-Based Access Control (ABAC)** evaluates access based on attributes of the subject (user), the resource, the action, and the environment — rather than static role assignments. Instead of "Editors can write documents," ABAC expresses rules like "users can write documents if the document belongs to their department AND their clearance level is at least the document's classification AND it's during business hours." ABAC enables fine-grained, context-aware authorization that RBAC cannot express. It's the natural evolution when RBAC becomes insufficient — typically when you need row-level isolation, resource ownership checks, data-level security, or compliance-driven policies. The trade-off is evaluation complexity: each access decision requires evaluating a policy against multiple attribute values, making policy management and performance critical engineering concerns.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### ABAC Policy Structure (XACML-inspired)

```
Access Decision = f(Subject Attributes, Resource Attributes, Action, Environment)

Subject attributes:   user.department, user.clearanceLevel, user.role, user.contractorStatus
Resource attributes:  document.classification, document.ownerId, document.department
Action:               read, write, delete, publish, approve
Environment:          currentTime, userIP, requestedFrom (geoLocation)
```

### ABAC Policy Examples

```typescript
// Policy 1: Department-scoped access
// "A user can read a document if they're in the same department as the document"
policy ReadDocumentByDepartment = {
  effect: 'allow',
  action: 'document:read',
  condition: (subject, resource) => subject.department === resource.department,
};

// Policy 2: Classification + clearance check
// "A user can read a document only if their clearance >= document classification"
const CLEARANCE_LEVELS = { public: 0, internal: 1, confidential: 2, secret: 3 };
policy ReadByClassification = {
  effect: 'allow',
  action: 'document:read',
  condition: (subject, resource) =>
    CLEARANCE_LEVELS[subject.clearanceLevel] >= CLEARANCE_LEVELS[resource.classification],
};

// Policy 3: Time-bound access (environment attribute)
// "Can only approve records during business hours Mon-Fri"
policy BusinessHoursApproval = {
  effect: 'allow',
  action: 'record:approve',
  condition: (subject, resource, env) => {
    const hour = new Date(env.requestTime).getHours();
    const day = new Date(env.requestTime).getDay();
    return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
  },
};

// Policy 4: Ownership check (most common use case)
policy OwnDocumentOnly = {
  effect: 'allow',
  action: 'document:delete',
  condition: (subject, resource) => resource.ownerId === subject.userId,
};
```

### ABAC Policy Engine (TypeScript)

```typescript
interface Policy<S = any, R = any, E = any> {
  id: string;
  effect: 'allow' | 'deny';
  actions: string[];
  condition: (subject: S, resource: R, action: string, env: E) => boolean;
}

class ABACEngine {
  private policies: Policy[] = [];

  addPolicy(policy: Policy): void {
    this.policies.push(policy);
  }

  evaluate(
    subject: Record<string, unknown>,
    resource: Record<string, unknown>,
    action: string,
    environment: Record<string, unknown> = {}
  ): 'allow' | 'deny' {
    const applicablePolicies = this.policies.filter(
      p => p.actions.includes(action) || p.actions.includes('*')
    );

    // Deny-override: any explicit deny beats all allows
    const hasDeny = applicablePolicies.some(
      p => p.effect === 'deny' && p.condition(subject, resource, action, environment)
    );
    if (hasDeny) return 'deny';

    const hasAllow = applicablePolicies.some(
      p => p.effect === 'allow' && p.condition(subject, resource, action, environment)
    );
    return hasAllow ? 'allow' : 'deny';  // default deny
  }
}

// Usage
const engine = new ABACEngine();
engine.addPolicy({
  id: 'dept-read',
  effect: 'allow',
  actions: ['document:read'],
  condition: (sub, res) => sub.department === res.department,
});

const result = engine.evaluate(
  { userId: 'user_1', department: 'engineering' },       // subject
  { documentId: 'doc_1', department: 'engineering' },    // resource
  'document:read'
);
// → 'allow'
```

### RBAC vs ABAC: When to Use Which

| Scenario | RBAC | ABAC |
|---|---|---|
| "Admins can delete all records" | ✅ Role check | Overkill |
| "Users can edit only their own records" | ❌ Can't express | ✅ ownerId === userId |
| "Only senior engineers can approve docs > $50K" | ❌ Would need a special role | ✅ clearanceLevel + amount |
| "Access only from corporate IP range" | ❌ Not expressible | ✅ Environment attribute |
| "Manager can approve for their direct reports only" | ❌ Dynamic relationship | ✅ OR use ReBAC |

### Performance Considerations

```
ABAC evaluation involves:
1. Fetching subject attributes (user profile from DB/cache)
2. Fetching resource attributes (document metadata from DB)
3. Evaluating policy conditions (CPU, but fast if cached)

At scale:
- Cache subject attributes in Redis (keyed by userId, TTL = session length)
- Embed stable attributes in JWT (department, clearanceLevel, role)
- Use database-level row-level security for data-tier ABAC
  (PostgreSQL RLS: CREATE POLICY ... USING (owner_id = current_user_id()))
- Avoid N+1: evaluate permissions for a list of resources using a WHERE clause, not per-row logic
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**AWS IAM Policies (ABAC-style):**
AWS IAM condition keys are ABAC in practice: `"StringEquals": {"aws:ResourceTag/Department": "${aws:PrincipalTag/Department}"}` — user's department tag must match resource's department tag. This is a pure ABAC predicate using subject and resource attributes.

**Google Drive:**
Sharing model uses ABAC: `IF user is in document's domain AND document is not restricted AND user has viewer link → allow read`. This can't be expressed as pure RBAC because the sharing URL link and domain membership are dynamic resource attributes.

**Healthcare (HIPAA):**
"Clinician can access patient record IF they are the patient's caring physician OR assigned covering physician on this date AND the request comes from a registered hospital terminal." Pure ABAC — role alone ("doctor") is insufficient because authorization depends on the specific patient-physician relationship and environment context.

**SAP Fiori (Hruday's context):**
SAP authorization objects are effectively ABAC: they evaluate `T-Code = FB50 AND Controlling Area = 1000 AND Company Code = DE01`. The same user's role might grant FB50 for Company Code DE01 but not UK01 — attribute-based filtering within a role, which is RBAC + ABAC hybrid.

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "ABAC is the authorization model you reach for when RBAC runs out of expressiveness. The classic signal is when you find yourself creating roles to solve resource-level isolation: 'editor-dept-engineering', 'editor-dept-finance' — you're fighting the RBAC model. With ABAC, you write a single policy: 'user can edit documents where document.department equals user.department.' The access decision evaluates attributes at runtime rather than static role membership. In practice, most production systems are RBAC + ABAC hybrid: RBAC for coarse-grained endpoint access ('are you an editor?'), ABAC predicates for resource-level isolation ('is this your department's data?'). The engineering challenges are policy management (who owns and understands the policies?) and performance (each decision may require DB fetches for resource attributes). I solve the performance problem by embedding stable subject attributes in the JWT and using database row-level security for data-tier ABAC — PostgreSQL's RLS policies push the ABAC predicate into the query itself, so you're not doing a per-row check over HTTP."

**Likely Follow-up Questions:**
1. *How do you visualize/audit ABAC policies?* → Maintain a policy registry with version history; use simulation mode (OPA's test runner) to evaluate policies against sample inputs; require policy review in PRs
2. *What is Open Policy Agent (OPA)?* → Open-source policy evaluation engine; you write policies in Rego language; OPA evaluates them against input JSON (subject + resource + action); sidecar pattern in microservices
3. *What's the difference between ABAC and ReBAC?* → ABAC uses static attribute predicates; ReBAC (Relationship-Based Access Control) derives access from the graph of relationships between users and resources (Google Zanzibar)
4. *How do you prevent ABAC policy explosion?* → Policy consolidation, well-defined namespacing, maximum 3 attributes per policy condition; prefer reusable policy fragments
5. *Can you do ABAC on the frontend?* → For UI rendering only — read attributes from JWT/user store, evaluate conditions locally. Never for security — backend must re-evaluate on every request with authoritative attribute values

**How to Explain Trade-offs Verbally:**
> "ABAC is more powerful than RBAC but adds complexity that can become a liability — policies are harder to understand than a simple role list. Teams often find ABAC policies become undocumented tribal knowledge. The mitigation is treating policies as code: versioned, reviewed in PRs, automatically tested, stored in a policy registry. I default to RBAC and introduce ABAC predicates surgically, only where RBAC provably can't express the requirement."

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (RBAC + ABAC Hybrid — Most Common Production Pattern)
────────────────────────────────────────────────────────────

```typescript
// Hybrid: RBAC for endpoint gate + ABAC for resource filter

// Middleware layer 1: RBAC — does this role have access to this endpoint?
function requireRole(roles: string[]) {
  return (req: AuthdRequest, res: Response, next: NextFunction) => {
    if (!roles.some(r => req.user.roles.includes(r))) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    next();
  };
}

// Middleware layer 2: ABAC — does user have access to this specific resource?
function requireDepartmentAccess(req: AuthdRequest, res: Response, next: NextFunction) {
  // ABAC predicate: user.department must match document.department
  // Evaluated at query level for performance (not per-row in application)
  req.abacFilter = { department: req.user.department };  // attach to query
  next();
}

// Repository: applies ABAC filter to database query
async function getDocuments(userId: string, abacFilter: Partial<Document>) {
  return db.documents.findAll({
    where: {
      ...abacFilter,  // department: 'engineering' — SQL WHERE clause
      // Alternative: PostgreSQL row-level security handles this at DB level
    }
  });
}

// Route: RBAC gate + ABAC filter
router.get('/documents',
  authenticate,
  requireRole(['editor', 'viewer', 'admin']),  // RBAC: endpoint gate
  requireDepartmentAccess,                      // ABAC: resource scope
  async (req, res) => {
    const docs = await getDocuments(req.user.id, req.abacFilter);
    res.json(docs);
  }
);

// PostgreSQL RLS (optimal for ABAC at data layer):
// CREATE POLICY dept_isolation ON documents
//   USING (department = current_setting('app.user_department'));
// SET app.user_department = 'engineering'; -- set per connection
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"ABAC = 'Can user do action IF attributes match?' RBAC = 'Can role do action?'"**

RBAC is a boolean: does this role have this permission? ABAC is a predicate: does the combination of user + resource + environment satisfy this condition? The key mental model: **RBAC gates the door; ABAC gates which rooms inside**. You need a badge to enter the building (RBAC) and the right clearance level for each room (ABAC).

**If you go blank:** "ABAC evaluates access based on attributes: user.department, resource.classification, time. Used when RBAC can't express resource-level isolation. Most production systems are RBAC + ABAC hybrid. OPA is the standard open-source ABAC engine. Performance key: embed stable subject attributes in JWT; push ABAC predicates to DB query level."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Compliance**: GDPR data minimisation, HIPAA patient record access, and SOC 2 control requirements often mandate resource-level access isolation that only ABAC can express correctly
→ **Product flexibility**: Enterprise customers expect department-based, project-based, and clearance-based data isolation — ABAC makes this configuration-driven, not code-rewrite driven
→ **Security depth**: ABAC prevents IDOR at the data query level — unauthorized records never enter the application layer because the WHERE clause excludes them

**How it works:**
→ Policies define conditions as boolean predicates over subject attributes (user properties), resource attributes (record properties), action, and environment context. A policy engine evaluates applicable policies against the request's attribute values. Allow wins unless any deny policy fires (deny-override). For performance, attribute lookups are cached and stable attributes are embedded in JWTs; the heaviest evaluation happens via database-level row policies rather than application-level filtering.

**Company relevance:**
→ **Microsoft**: Azure's IAM condition keys are ABAC — "Allow IF resource tag department equals user tag department" — direct application in Entra ID and Azure Policy
→ **Adobe**: Collaborative features in Creative Cloud documents (edit only your own assets, view team assets) use attribute predicates — ownerId and teamId checks at the storage service level
→ **Salesforce**: Record sharing rules and territory management are effectively ABAC — "Sales rep can see accounts assigned to their territory" is an attribute predicate evaluated per record
→ **Cisco**: Cisco's DevNet APIs use ABAC for organization-based resource isolation — only members of an organization can access its connected devices and configuration resources
