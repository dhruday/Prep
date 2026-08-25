# 194. Policy-Based Authorization

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Policy-Based Authorization** externalizes access decisions from application code into declarative, versioned policy documents evaluated by a dedicated policy engine. Rather than embedding `if (user.role === 'admin')` checks throughout your codebase, you define policies as structured rules in a language like Rego (OPA) or JSON-based CASL, and your application queries the engine: *"Can this user perform this action on this resource?"* The engine evaluates all applicable policies and returns allow/deny. This decoupling means policies can evolve without code changes, be reviewed in PRs, be tested in isolation, and be reused across microservices. It is the authorization model required by enterprises with complex compliance requirements — SOC 2, HIPAA, GDPR — where the proof of authorization policies must be auditable and change-controlled.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Architecture: Embedded vs Sidecar vs Service

```
Pattern 1: Embedded engine (CASL, casbin)
  Frontend/Backend App → evaluates policies in-process
  ✓ Low latency (no network hop)
  ✗ Policies bundled with code — must redeploy for policy changes

Pattern 2: OPA Sidecar (most common in microservices)
  Service → HTTP → OPA Process (same pod/VM)
  ✓ Policy updates without service restart
  ✓ ~1–5ms latency (local network)
  ✓ Consistent across all services

Pattern 3: Centralized Authorization Service (e.g., Auth0 FGA, SpiceDB)
  Service → HTTP → Auth Service (separate pod)
  ✓ Shared across all services
  ✓ Supports ReBAC (Google Zanzibar model)
  ✗ Network round-trip on every authorization check (~10–50ms)
```

### Open Policy Agent (OPA) — Industry Standard

```rego
# opa/policies/documents.rego
package documents

import future.keywords.if

# Default: deny all
default allow := false

# Allow: readers can read any document in their department
allow if {
    input.action == "read"
    input.user.department == input.resource.department
}

# Allow: admin can do anything
allow if {
    "admin" in input.user.roles
}

# Allow: owner can delete their own document
allow if {
    input.action == "delete"
    input.user.id == input.resource.ownerId
}

# Deny: classified documents require minimum clearance (deny-override)
deny if {
    input.resource.classification == "secret"
    input.user.clearanceLevel < 3
}
```

```typescript
// Querying OPA from a Node.js service
async function isAllowed(
  user: UserContext,
  action: string,
  resource: ResourceContext
): Promise<boolean> {
  const response = await fetch('http://localhost:8181/v1/data/documents/allow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { user, action, resource }
    })
  });
  const { result } = await response.json();
  return result === true;  // default false if OPA returns undefined
}

// Express middleware using OPA
function opaMiddleware(action: string) {
  return async (req: AuthdRequest, res: Response, next: NextFunction) => {
    const allowed = await isAllowed(req.user, action, req.resource);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

router.delete('/documents/:id',
  authenticate,
  loadResource,
  opaMiddleware('delete'),  // delegates to OPA policy
  deleteHandler
);
```

### CASL — Frontend-Friendly Policy Library

```typescript
// CASL: policy-based authz for JavaScript/TypeScript (frontend + Node.js)
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { MongoAbility } from '@casl/ability';

type Actions = 'read' | 'write' | 'delete' | 'manage';
type Subjects = 'Document' | 'User' | 'all';
type AppAbility = MongoAbility<[Actions, Subjects]>;

function defineAbilitiesFor(user: User): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (user.roles.includes('admin')) {
    can('manage', 'all');  // admin can do everything
  } else {
    can('read', 'Document', { department: user.department });
    can('write', 'Document', { ownerId: user.id });
    cannot('delete', 'Document', { classification: 'secret' });
  }
  return build();
}

// React: use abilities for conditional rendering
import { useAbility } from '@casl/react';

function DocumentCard({ doc }: { doc: Document }) {
  const ability = useAbility(AbilityContext);
  return (
    <div>
      <h3>{doc.title}</h3>
      {ability.can('write', doc) && <EditButton />}
      {ability.can('delete', doc) && <DeleteButton />}
    </div>
  );
}

// CASL condition is serializable — same ability definition used server-side
// to build MongoDB/SQL query filters (ensures ABAC at the data layer too)
```

### Policy Testing — Policies as Code

```bash
# OPA: test your policies in isolation
# policies/documents_test.rego
package documents_test

test_admin_can_do_anything {
    allow with input as {
        "user": {"roles": ["admin"], "id": "u1"},
        "action": "delete",
        "resource": {"ownerId": "someone_else"}
    }
}

test_non_owner_cannot_delete {
    not allow with input as {
        "user": {"roles": ["editor"], "id": "u1"},
        "action": "delete",
        "resource": {"ownerId": "u2"}
    }
}

# Run: opa test ./policies/
# All tests pass — CI gate on policy changes
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Netflix (OPA):**
Netflix uses OPA as a centralized policy engine across hundreds of microservices. Instead of each service duplicating authorization logic, they deploy OPA sidecars and define policies in Rego. A policy change — like a new compliance requirement — is a PR to the policy repository, not a service code change. The policy PR is reviewed, tested, and deployed independently of service code.

**Airbnb:**
Uses CASL-inspired policy modeling for host vs guest permissions on listings, bookings, and messages. The same policy definitions run server-side (Express middleware) and client-side (React conditional rendering) — ensuring the UI matches the backend enforcement without duplicating logic.

**SAP BTP / Hruday's context:**
SAP Business Technology Platform uses policy-based authorization for service bindings — which applications can call which services is governed by policy documents, not hardcoded checks. The CF (Cloud Foundry) platform evaluates these policies on every service call.

**Kubernetes RBAC + OPA:**
Kubernetes clusters often combine native Kubernetes RBAC with OPA's Gatekeeper (admission controller) — Kubernetes RBAC controls who can create what, while OPA policies enforce additional invariants ("all pods must have specific labels", "images must come from approved registries"). This is policy-based authorization at the infrastructure level.

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Policy-based authorization is the architectural pattern of externalizing access decisions from application code into a dedicated policy engine. Instead of `if (user.role === 'admin') { allow() }` scattered across hundreds of endpoints, you define policies in a centralized, versioned policy document and query the engine per request. The industry standard for this is Open Policy Agent — you write policies in Rego, deploy OPA as a sidecar, and each service does an HTTP query to localhost:8181 to check authorization. The business value is enormous for compliance-heavy environments: SOC 2 requires demonstrating access control policies are defined, controlled, and auditable. With policies as code — Rego files in a Git repo with PR reviews and test coverage — you can produce that audit trail automatically. For the frontend, CASL is the equivalent — it defines abilities using the same subject/action/resource model, runs in the browser for conditional rendering, and runs in Node.js for server enforcement, ensuring consistency between the two. The performance concern I address via OPA's bundle API — policies are precompiled and cached locally in the sidecar, so evaluation is microseconds, not network round-trips."

**Likely Follow-up Questions:**
1. *What is Rego and how does it differ from just using if-else code?* → Rego is a declarative logic language; policies are data, not imperative code — they can be analyzed, tested, and audited independently of the service
2. *How do you manage policy drift across microservices?* → Single policy repository, policies versioned with services via Git tags, OPA bundle server distributes policy updates — all services always run the same policy version
3. *How is OPA different from a simple permission check in middleware?* → OPA decouples policy from enforcement point; same OPA policy can be evaluated by 20 different services; changing a rule once changes it everywhere
4. *What's the latency cost of OPA?* → OPA sidecar (local process): 1–5ms. OPA over network: 10–50ms. In-process CASL: <1ms. For high-throughput APIs, use in-process CASL or OPA's native Go embeddings
5. *When would you NOT use a policy engine?* → For simple RBAC with <5 roles and no attribute conditions — the overhead of a policy engine isn't justified; plain middleware role checks are cleaner

**How to Explain Trade-offs Verbally:**
> "The trade-off with policy-based authorization is upfront complexity for long-term maintainability gains. Setting up OPA, writing Rego, maintaining the policy repo — it's real work. But the alternative — scattered `if (user.role === X)` checks in 50 API handlers — is technical debt that compounds. Policy changes require finding and updating every check. Bugs cause security gaps. For systems with complex access rules, compliance requirements, or shared logic across multiple services, the policy engine investment pays off quickly. For a single-service startup with 3 roles, it's overkill."

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (CASL in React + Node.js — Consistent Policies)
────────────────────────────────────────────────────────────

```typescript
// shared/abilities.ts — SAME file used in both React and Express
import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';

export type Actions = 'read' | 'create' | 'update' | 'delete' | 'manage';
export type Subjects = 'Document' | 'User' | 'Billing' | 'all';
export type AppAbility = MongoAbility<[Actions, Subjects]>;

export function buildAbility(user: { roles: string[]; id: string; department: string }): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (user.roles.includes('admin')) {
    can('manage', 'all');
    return build();
  }

  // All authenticated users
  can('read', 'Document', { department: user.department });
  can('read', 'Document', { isPublic: true });

  if (user.roles.includes('editor')) {
    can('create', 'Document');
    can('update', 'Document', { ownerId: user.id });
  }

  can('delete', 'Document', { ownerId: user.id });
  cannot('delete', 'Document', { classification: 'official' });  // deny-override

  return build();
}

// ─────────────────────────────────────────────────────

// React usage (frontend — UX rendering):
// AbilityContext.tsx
import { createContext, useContext } from 'react';
const AbilityContext = createContext<AppAbility>(null!);
export const useAbility = () => useContext(AbilityContext);

// In component:
const ability = useAbility();
return ability.can('delete', document) ? <DeleteBtn /> : null;

// ─────────────────────────────────────────────────────

// Express usage (backend — security enforcement):
import { ForbiddenError } from '@casl/ability';

function authorize(action: Actions, subject: Subjects) {
  return async (req: AuthdRequest, res: Response, next: NextFunction) => {
    const ability = buildAbility(req.user);
    try {
      ForbiddenError.from(ability).throwUnlessCan(action, req.resource as Subjects);
      next();
    } catch {
      res.status(403).json({ error: 'Forbidden' });
    }
  };
}

router.delete('/documents/:id', authenticate, loadResource, authorize('delete', 'Document'), handler);
// ↑ Same buildAbility() function — guaranteed consistent behavior between frontend UX and backend enforcement
```

**Why this structure:**
- `buildAbility()` in a shared package ensures frontend rendering and backend enforcement use identical policy logic — no drift
- CASL conditions (`{ ownerId: user.id }`) translate directly to MongoDB/Mongoose query filters, ensuring ABAC pushes down to DB level
- `ForbiddenError.throwUnlessCan()` provides a clean throw-based API for middleware chains

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"Policy-based = authorization as code. Policies live in Git, not in if-statements."**

OPA = backend policy engine (Rego language, sidecar pattern, 1-5ms). CASL = JavaScript policy library (frontend + backend, same policy definition). Both follow: define policy → query engine → get allow/deny → trust the result.

**If you go blank:** "Policy-based authorization externalizes access decisions from code into versioned, testable policy documents. OPA/Rego for microservices (sidecar), CASL for JavaScript/TypeScript (same policies on frontend and backend). Enables compliance audit trails because policies are in Git with PR history. Trade-off: setup complexity vs maintainability at scale."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Compliance**: SOC 2, HIPAA, ISO 27001 require access control policies to be documented, versioned, and auditable — policies in Git with CI/CD fulfills this automatically
→ **Maintainability**: Changing one policy file updates authorization behavior across all services — no hunting through 200 API handlers
→ **Security consistency**: All services evaluate the same policy version — eliminates authorization drift between services that plagued hand-coded checks

**How it works:**
→ Policies are written in a declarative language (Rego for OPA, ability definitions for CASL) and versioned in Git. At runtime, the application submits a request context (user + resource + action) to the policy engine. The engine evaluates all applicable policies and returns allow or deny. For microservices, OPA runs as a sidecar; for frontend-heavy apps, CASL runs in-process. Policy PRs require review and pass automated tests before deployment.

**Company relevance:**
→ **Microsoft**: Azure Policy and Azure Active Directory Conditional Access are policy-based authorization systems at infrastructure scale — understanding the model is critical for Microsoft interviews
→ **Adobe**: Creative Cloud enterprise deployments use policy-driven access for compliance with HIPAA (healthcare clients), FedRAMP (government), and GDPR — policy-based authz is their compliance backbone
→ **Salesforce**: Apex Class Security, Sharing Rules, and Flow access controls are all policy-based — they evaluate declarative rules, not imperative code
→ **Cisco**: Cisco ISE (Identity Services Engine) uses policy-based network access control — the same model applied to determining which device gets which network segment
