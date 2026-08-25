# 197 – Data-Level Security

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Data-level security is the most granular layer of access control — it governs which specific records a user can access, and which fields within those records they can see or modify. It operates at two levels: **row-level** (user A can see only their own orders, not all orders) and **field-level** (a viewer can see a name but not a salary or credit card number). Unlike route guards or feature flags, data-level security must be enforced in the backend — the database query itself should only return authorized rows, and the API serializer must strip unauthorized fields. Frontend masking is UX only. The primary attack this prevents is **IDOR (Insecure Direct Object Reference)** — where a user directly accesses a resource they don't own by guessing its ID.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Two Dimensions of Data-Level Security

```
                  ┌─────────────────┐
 Row-Level        │  User can only  │   → WHERE clause / DB policy
 Security (RLS)   │  see their rows │   → ownership check
                  └─────────────────┘

                  ┌─────────────────┐
 Field-Level      │  Some fields    │   → Serializer field filter
 Security (FLS)   │  are stripped   │   → Backend projection
                  └─────────────────┘
```

### Row-Level Security Approaches

**Option 1: Application-level WHERE clause**
```sql
SELECT * FROM invoices
WHERE owner_id = :userId    -- or tenant_id = :tenantId
  AND org_id = :orgId
```
Risk: easy to forget in a new query. Not centralized.

**Option 2: PostgreSQL Row-Level Security (RLS)**
```sql
CREATE POLICY user_isolation ON invoices
  USING (owner_id = current_setting('app.user_id')::uuid);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
```
Database enforces the policy for ALL queries — developer can't forget.

**Option 3: ORM-level scope (TypeORM/Prisma)**
```typescript
// TypeORM global scope — auto-applied to all queries
@Entity()
export class Invoice {
  // ...
}

// Repository pattern with tenant scope
findInvoices(userId: string) {
  return this.repo.find({ where: { ownerId: userId } });
}
```

### Field-Level Security Approaches

**Option 1: DTO projection (recommended)**
```typescript
class InvoiceViewerDto {
  id: string;
  amount: number;
  status: string;
  // No: creditCard, taxId, internalNotes
}
class InvoiceAdminDto extends InvoiceViewerDto {
  creditCard: string; // last 4 only
  taxId: string;
  internalNotes: string;
}
```

**Option 2: Transform decorator (class-transformer)**
```typescript
@Exclude()
class Invoice {
  @Expose({ groups: ['admin'] })
  creditCardNumber: string;

  @Expose()
  amount: number;
}
```

### IDOR Prevention Pattern

```
❌ IDOR-vulnerable:
   GET /api/invoices/12345     → returns invoice, no ownership check

✅ IDOR-secure:
   GET /api/invoices/12345     → check: invoice.ownerId === req.user.id
                               → 403 if mismatch, even if ID exists
```

### Frontend Data Masking (UX only)

```typescript
// Angular pipe — mask credit card for display
@Pipe({ name: 'maskCard' })
export class MaskCardPipe implements PipeTransform {
  transform(value: string): string {
    return value ? `**** **** **** ${value.slice(-4)}` : '';
  }
}
```
**Critical**: This is UX only. Unmasked data must never reach the frontend for unauthorized users.

### Anti-Patterns

- ❌ Relying on frontend masking for security (data still in browser memory/network tab)
- ❌ No ownership check in update/delete routes (any user can mutate any record)
- ❌ Exposing sequential IDs (makes IDOR trivial to exploit — use UUIDs)
- ❌ Admin-only fields in public DTOs (even if null, the field name leaks schema)

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG-Scale: Salesforce Field-Level Security

Salesforce enforces both RLS and FLS at the platform level. Every SOQL query is automatically filtered based on the user's permission set: records are filtered by sharing rules (RLS), fields return null if the user lacks FLS access. A developer who forgets to check permissions still can't expose unauthorized data because the platform enforces it at query execution time.

### Hruday @ SAP Labs — BTP Document Management

At SAP, our document management app enforced row-level ownership at the repository layer. Every `findBy*` method in our TypeORM repositories included an implicit `tenantId` and `ownerId` scope applied via a custom `withScope()` decorator. This prevented a common junior engineer mistake of writing `findById(id)` without the ownership check. We additionally used separate DTO classes per ACL role — `DocumentViewerDto` never included the `internalRemarks` field that only admins could see.

### Hruday @ Oracle — ERP Field Masking

At Oracle ERP, salary and compensation fields were subject to FLS. The Angular frontend used a `maskField` pipe for display-level masking, but more importantly, the Spring Boot API serialized with `@JsonView` annotations that excluded compensation fields unless the requesting user had the `hr:compensation:view` scope. An unauthorized user who made a direct API call received a response without those fields entirely.

### Scaling context:

At 1K users, application-level WHERE clauses work fine. At 10M users, PostgreSQL RLS moves enforcement to the database tier — one policy enforced consistently across all 50+ application services that hit the same DB. Paired with connection pooling via PgBouncer with `SET LOCAL app.user_id`, this scales horizontally.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Data-level security operates at two dimensions: row-level (which records are accessible) and field-level (which fields within a record are visible). I implement row-level security at two layers simultaneously: a repository-level scope that adds a WHERE clause for the requesting user's ID or tenant, and ideally PostgreSQL RLS as a database-level backstop that catches any query that bypasses the application layer.*

*For field-level security, I use separate DTO classes per permission level. The serialization layer only includes the fields the requesting user is authorized to see — sensitive fields never reach the response. On the frontend, I use display masking (pipes/formatters) for UX, but I never rely on this for security — the API must not return the unmasked field to unauthorized users in the first place.*

*At Oracle, I prevented an IDOR vulnerability by auditing all GET-by-ID endpoints and adding ownership checks. We also switched from sequential integer IDs to UUIDs, making guessing-based IDOR attacks computationally infeasible."*

### Follow-up Questions

1. **"What is IDOR and how do you prevent it?"** — Insecure Direct Object Reference: accessing a resource by guessing/manipulating its ID without authorization check. Prevent with: UUID IDs + ownership check (`WHERE id=? AND owner_id=?`).
2. **"How does PostgreSQL RLS work?"** — Database-level policy attached to a table, evaluated against session variables (user ID/tenant ID). Applied to ALL queries automatically — app layer can't bypass it.
3. **"What's the difference between frontend masking and field-level security?"** — Frontend masking hides data from the UI but it still exists in the network response (visible in DevTools). True FLS means the field never leaves the backend for unauthorized users.
4. **"Why use UUIDs instead of sequential IDs?"** — Sequential IDs make IDOR trivial: increment ID by 1 to access another user's record. UUIDs are effectively unguessable (2^122 space).
5. **"How do you enforce RLS across microservices?"** — Either centralize at a data gateway (single DB with RLS), or each service enforces its own ownership check pattern with shared middleware.

### Comparison Table

| Layer | Mechanism | Enforcement Level |
|---|---|---|
| Row-Level (app) | WHERE owner_id = userId | Application code |
| Row-Level (DB) | PostgreSQL RLS policy | Database engine |
| Field-Level (DTO) | Separate DTO per role | Serialization layer |
| Field-Level (FLS) | Salesforce FLS | Platform metadata |
| Frontend masking | Pipe / formatter | UI display only |

### Trade-offs

- PostgreSQL RLS has performance impact for complex policies — benchmark; for simple tenant isolation the overhead is negligible
- Separate DTOs per role increase maintenance surface; worth it for PII/compliance fields
- Using `@JsonView` or `@Exclude` is elegant but hides security logic in annotations — explicit DTO projection is more readable

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// NestJS — IDOR-safe resource endpoint
@Get(':id')
@UseGuards(JwtAuthGuard)
async findOne(
  @Param('id', ParseUUIDPipe) id: string,
  @CurrentUser() user: AuthUser
): Promise<InvoiceDto> {
  const invoice = await this.invoiceService.findByIdAndOwner(id, user.id);
  if (!invoice) throw new NotFoundException(); // 404 not 403 — avoid info leak
  return plainToClass(
    user.hasPermission('invoice:admin') ? InvoiceAdminDto : InvoiceViewerDto,
    invoice,
    { excludeExtraneousValues: true }
  );
}

// Invoice service — ownership-scoped query
async findByIdAndOwner(id: string, userId: string): Promise<Invoice | null> {
  return this.repo.findOne({
    where: {
      id,
      ownerId: userId  // ownership check is part of the query
    }
  });
}

// DTOs — field-level control via class-transformer
class InvoiceViewerDto {
  @Expose() id: string;
  @Expose() amount: number;
  @Expose() status: string;
  @Expose() createdAt: Date;
  // creditCard, taxId NOT exposed
}

class InvoiceAdminDto extends InvoiceViewerDto {
  @Expose()
  get creditCard(): string {
    return `**** **** **** ${this.ccLast4}`;
  }
  @Expose() taxId: string;
  @Expose() internalNotes: string;
}

// PostgreSQL RLS — database-level backstop
// CREATE POLICY invoice_isolation ON invoices
//   USING (owner_id = current_setting('app.user_id')::uuid
//          OR is_admin = true);
// ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

// Angular — display masking pipe (UX only)
@Pipe({ name: 'maskCard', standalone: true })
export class MaskCardPipe implements PipeTransform {
  transform(value: string | null): string {
    if (!value) return '';
    return `•••• •••• •••• ${value.slice(-4)}`;
  }
}
```

**Why this structure:**
- `ParseUUIDPipe` rejects non-UUID IDs before reaching service layer
- 404 (not 403) on ownership failure — avoids confirming resource existence
- `plainToClass` with `excludeExtraneousValues` ensures DTO is the single source of field control
- PostgreSQL RLS as second defense — catches queries that bypass application layer

**Interviewer focus:** IDOR pattern, 404 vs 403 choice, DTO-based FLS, UUID IDs

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Backend owns the data, frontend owns the display."** Row filtering: WHERE clause + PostgreSQL RLS (two layers). Field filtering: use separate DTOs per permission level — never expose a field in a DTO if the user can't see it. Return **404** (not 403) when ownership check fails — avoids leaking whether the resource exists. UUIDs prevent IDOR guessing attacks. Frontend masking is cosmetic; a DevTools network tab reveals the real response. The rule: *sensitive data must never leave the server for unauthorized users*.

*If you go blank*: "IDOR = no ownership check. Fix: UUID IDs + WHERE owner_id in query. FLS: separate DTO class per role. Return 404 on access denied."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
- IDOR is consistently in the OWASP Top 10 (Broken Access Control) — it's the most commonly exploited API vulnerability
- PII fields like salary, SSN, credit card numbers exposed via missing FLS create GDPR/compliance violations that cost millions
- Row-level leakage in multi-tenant SaaS (seeing another tenant's data) is catastrophic for enterprise trust and contracts

**How it works:**
Row-level security adds ownership conditions (userId/tenantId) to every database query. The database or ORM layer enforces this before data reaches the application. Field-level security uses serialization-time DTO projection — only fields explicitly exposed in the role-appropriate DTO class are included in the response.

**Company-specific relevance:**
- **Microsoft**: Azure SQL row-level security for multi-tenant SaaS deployments is a documented best practice — RLS policies in Azure SQL tie to user context
- **Adobe**: Creative Cloud document sharing uses row-level permissions — a shared document is visible to collaborators, private documents are filtered at the query level
- **Salesforce**: First-class FLS built into the SOQL engine — field returns null automatically if the user lacks visibility permission
- **Cisco**: Packet trace data and device configurations are subject to data-level access control — only device owners and authorized admins can retrieve detailed telemetry records
