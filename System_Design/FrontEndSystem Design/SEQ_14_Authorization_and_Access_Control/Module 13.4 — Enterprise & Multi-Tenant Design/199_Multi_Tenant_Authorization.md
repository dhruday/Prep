# 199 – Multi-Tenant Authorization

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Multi-tenant authorization ensures that users in one tenant (organization, workspace, or account) can never access data belonging to another tenant — even if they share the same infrastructure. Every resource access check must validate both the user's identity **and** their tenant membership. There are three primary isolation models: **siloed** (separate database per tenant — complete isolation, high cost), **pooled** (shared database with tenant ID column + RLS — cost-efficient, higher engineering discipline), and **hybrid** (pooled for small tenants, siloed for enterprise). The key engineering challenge is ensuring the `tenantId` is propagated through every layer — HTTP context, database queries, cache keys, background jobs, and audit logs.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Three Isolation Models

```
┌─────────────────────────────────────────────────────────────────────┐
│ SILOED              │ POOLED                │ HYBRID                 │
│ Separate DB         │ Shared DB + tenant_id │ Pooled + silo on demand│
│ per tenant          │ column                │                        │
│ ─────────────────── │ ───────────────────── │ ──────────────────────│
│ Pros: Zero leak risk│ Pros: Cost-efficient  │ Pros: Best of both     │
│ Cons: $$$, ops heavy│ Cons: RLS discipline  │ Cons: Complexity       │
│ Used: Enterprise,   │ Used: SMB SaaS,       │ Used: Salesforce,      │
│ government, banking │ startup scale         │ Microsoft 365          │
└─────────────────────────────────────────────────────────────────────┘
```

### Tenant Context Propagation

```
HTTP Request
  Headers: { Authorization: "Bearer JWT:sub=user1,tenantId=org_abc" }
      ↓
Middleware: extract tenantId from JWT → store in AsyncLocalStorage
      ↓
Service layer: reads tenantId from context — no prop-drilling
      ↓
Repository: auto-scopes all queries WHERE tenant_id = :tenantId
      ↓
Cache key: `invoice:${tenantId}:${invoiceId}` — tenant-namespaced
      ↓
Audit log: { tenantId, userId, action, resource, timestamp }
```

### Tenant Resolution Strategies

| Strategy | Example | Use Case |
|---|---|---|
| Subdomain | `acme.app.com` → tenant = "acme" | SaaS with branded subdomains |
| JWT claim | `{ tenantId: "org_abc" }` in token | API-first SaaS |
| Path prefix | `/api/tenants/org_abc/invoices` | REST convention |
| Custom header | `X-Tenant-ID: org_abc` | B2B integrations |

### Permission Scope in Multi-Tenant

```typescript
// Tenant = { permissions, roles } are tenant-scoped
// Same user may be admin in tenant A but viewer in tenant B
interface UserClaims {
  sub: string;              // user ID (global)
  tenantId: string;         // current tenant context
  roles: string[];          // roles IN THIS TENANT
  permissions: string[];    // permissions IN THIS TENANT
}
```

### Database-Level Enforcement (PostgreSQL RLS)

```sql
-- Tenant isolation policy — the backstop
CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Set per-request:
SET LOCAL "app.tenant_id" = 'org_abc_123';
```

### Anti-Patterns

- ❌ Trusting `tenantId` from the client request body/query (always from server-verified JWT)
- ❌ Missing tenant check in background jobs (worker processes don't have HTTP context)
- ❌ Cache without tenant namespace: `cache.get('invoices')` — tenant A gets tenant B's data
- ❌ Sequential integer IDs across tenants — IDOR trivially crosses tenant boundaries
- ❌ Logging without `tenantId` — breaks forensic investigation per tenant

### Cross-Tenant Access (Legitimate)

Some scenarios require cross-tenant access (e.g., super-admin, support, resellers):

```typescript
// Explicit elevation — audited, time-limited
const context: TenantContext = {
  tenantId: targetTenantId,
  actingAs: 'admin',
  requestedBy: supportAgentId,  // logged
  expiresAt: Date.now() + 15 * 60 * 1000  // 15-minute TTL
};
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG-Scale: Salesforce Multi-Tenant Architecture

Salesforce is the canonical multi-tenant SaaS. Every table has an `OrgId` column (Salesforce's tenantId). The platform enforces tenant isolation at the query optimizer level — SOQL queries are rewritten to include `AND OrgId = :currentOrgId` automatically. The engineering innovation is that this enforcement is at the database abstraction layer, not the application layer, making it impossible for a developer to accidentally write a tenant-crossing query.

### FAANG-Scale: Microsoft 365

Microsoft 365 uses an enterprise model: large organizations get isolated infrastructure (Exchange Online has dedicated regions for GDPR compliance). The Azure AD tenant concept is the central isolation boundary — every API call includes a `tenantId` in the access token, and all resource access is validated against tenant membership at the Azure AD authorization layer.

### Hruday @ SAP Labs — SAP BTP Multi-Tenant Services

At SAP, our BTP (Business Technology Platform) apps were multi-tenant by design. XSUAA tokens contained a `zid` (zone ID = tenant ID). Our middleware extracted this and set it as the tenant context for every request. We used the pooled model with PostgreSQL RLS — every query was automatically scoped by tenant via a connection-level `SET LOCAL` command. We had a mandatory code review rule: no repository method could exist without `tenantId` in the WHERE clause.

### Scaling:

At 1K tenants, pooled model works effectively. At 100K tenants, connection pooling (PgBouncer with `statement` mode) becomes critical — `SET LOCAL` requires `transaction` or `session` pooling mode, which reduces pool efficiency. At this scale, consider moving tenantId enforcement to the application ORM layer with a TypeORM global scope.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Multi-tenant authorization means ensuring complete data isolation between tenants while sharing infrastructure. I always start with the question: where does tenantId come from? It must come from the verified JWT, never from the client request body — a malicious client could send any tenantId and access another tenant's data.*

*I typically implement the pooled model with PostgreSQL RLS as the database-level backstop. The tenantId is extracted from the JWT in middleware and stored in AsyncLocalStorage, making it available throughout the request lifecycle — services, repositories, and even background jobs — without prop-drilling. Every cache key is namespaced by tenantId. Every audit log entry includes tenantId.*

*At SAP, our BTP services extracted the XSUAA `zid` claim as the tenant context. We had a CI check that scanned for any ORM query missing the tenantId scope. This prevented the common bug where a new developer writes `findAll()` and accidentally returns all tenants' data."*

### Follow-up Questions

1. **"How do you handle background jobs that process tenant data?"** — Pass `tenantId` as a job payload field. The worker sets the tenant context before processing. Never inherit context from the scheduling process.
2. **"What's the difference between siloed and pooled multi-tenancy?"** — Siloed: separate DB per tenant (complete isolation, high cost). Pooled: shared DB with tenant_id column (cost-efficient, requires RLS discipline).
3. **"How do you namespaces the cache in multi-tenant SaaS?"** — Prefix every cache key with `tenantId`: `${tenantId}:${resource}:${id}`. Never cache cross-tenant aggregate without explicit tenantId in the key.
4. **"How does user role differ across tenants?"** — A user's roles are tenant-scoped — same person can be admin in tenant A and viewer in tenant B. The JWT contains tenant-specific role claims for the current tenant context.
5. **"How do you allow super-admin cross-tenant access safely?"** — Explicit elevation request with target tenantId, time-limited (15 min), logged as impersonation in audit trail.

### Comparison Table

| Model | Data isolation | Infrastructure cost | Engineering effort | Best for |
|---|---|---|---|---|
| Siloed (DB per tenant) | Perfect | Very high | Low (no tenant ID logic) | Enterprise, compliance |
| Pooled (shared DB + RLS) | Good (RLS enforced) | Low | Medium (RLS setup) | SMB SaaS |
| Schema-per-tenant | Good | Medium | Medium | Mid-market |
| Hybrid | Best of both | Medium | High | Large SaaS platforms |

### Trade-offs

- PostgreSQL RLS performance overhead: ~5-10% for simple policies, can be 30%+ for complex joins — benchmark at your scale
- AsyncLocalStorage adds implicit context — makes tracing harder; always include tenantId in spans/logs explicitly
- UUID IDs prevent IDOR but add join complexity over integers

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Multi-tenant middleware — extract and propagate tenantId
import { AsyncLocalStorage } from 'async_hooks';

export const tenantStorage = new AsyncLocalStorage<{ tenantId: string; userId: string }>();

// NestJS middleware
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // NEVER trust tenantId from request body/headers from client
    // Always extract from verified JWT
    const claims = req.jwtPayload as JwtClaims;
    if (!claims?.tenantId) throw new UnauthorizedException('Missing tenant context');

    tenantStorage.run({ tenantId: claims.tenantId, userId: claims.sub }, next);
  }
}

// Repository base — auto-scopes every query
@Injectable()
export class TenantScopedRepository<T extends { tenantId: string }> {
  constructor(private readonly repo: Repository<T>) {}

  private get tenantId(): string {
    const ctx = tenantStorage.getStore();
    if (!ctx) throw new InternalServerErrorException('No tenant context');
    return ctx.tenantId;
  }

  findAll(where: Partial<T> = {}): Promise<T[]> {
    return this.repo.find({ where: { ...where, tenantId: this.tenantId } as any });
  }

  findById(id: string): Promise<T | null> {
    return this.repo.findOne({ where: { id, tenantId: this.tenantId } as any });
  }

  // UUID ID generation — prevents cross-tenant IDOR
  create(data: Omit<T, 'id' | 'tenantId'>): Promise<T> {
    return this.repo.save({
      ...data,
      id: crypto.randomUUID(),
      tenantId: this.tenantId
    } as any);
  }
}

// Cache with tenant namespace
@Injectable()
export class TenantCacheService {
  constructor(private redis: RedisService) {}

  private key(resource: string, id: string): string {
    const { tenantId } = tenantStorage.getStore()!;
    return `${tenantId}:${resource}:${id}`;  // tenant-namespaced key
  }

  get<T>(resource: string, id: string): Promise<T | null> {
    return this.redis.get<T>(this.key(resource, id));
  }

  set<T>(resource: string, id: string, value: T, ttl = 300): Promise<void> {
    return this.redis.set(this.key(resource, id), value, ttl);
  }
}
```

**Why this structure:**
- `AsyncLocalStorage` removes the need to pass `tenantId` through every function signature
- Base repository class guarantees every query is tenant-scoped — new developers can't accidentally miss it
- Cache key namespacing means a cache flush for `org_abc` doesn't affect `org_xyz`
- `crypto.randomUUID()` for IDs prevents sequential ID IDOR across tenants

**Interviewer focus:** JWT as tenantId source, AsyncLocalStorage propagation, tenant-namespaced cache keys

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"TenantId is the JWT claim, not the query parameter."** Never let the client tell you which tenant they're in — extract it from the verified token. Propagate via `AsyncLocalStorage` to avoid prop-drilling. Three isolation models: **S**iloed (separate DB), **P**ooled (shared DB + RLS), **H**ybrid (both). Cache keys: always prefix with tenantId. Background jobs: pass tenantId in job payload — never inherit from scheduler context. PostgreSQL RLS is the backstop — even if someone writes a query without a WHERE clause, RLS filters it.

*If you go blank*: "Multi-tenant = every query needs tenantId from JWT, not client. Pooled model + PostgreSQL RLS + tenant-namespaced cache keys."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
- Multi-tenant data leakage is a catastrophic SaaS failure — one missing WHERE clause exposes all customers' data
- Enterprises (Microsoft, Salesforce, Adobe) require contractual data isolation as a procurement requirement
- Background jobs and cache are the two most common places tenantId is forgotten — causing silent cross-tenant data contamination

**How it works:**
The tenantId is extracted from the verified JWT claim in a middleware layer and stored in `AsyncLocalStorage`. The storage makes it available to all services and repositories processing that request without needing to pass it as a parameter. The repository base class automatically adds `WHERE tenant_id = :tenantId` to all queries. PostgreSQL RLS policies provide a database-level backstop.

**Company-specific relevance:**
- **Microsoft**: Azure AD tenant isolation is the foundation of M365 security — every API token is tenant-scoped and validated at each service boundary
- **Adobe**: Creative Cloud Workspaces use tenant isolation for enterprise customers — an employee's assets must never be visible to another company's workspace
- **Salesforce**: OrgId-based multi-tenancy is the foundational architectural pattern of the entire Salesforce platform — the gold standard for SaaS multi-tenancy
- **Cisco**: Cisco Meraki's dashboard isolates organization data — a network admin can only see devices in their organization, enforced at the API layer by organization membership claims
