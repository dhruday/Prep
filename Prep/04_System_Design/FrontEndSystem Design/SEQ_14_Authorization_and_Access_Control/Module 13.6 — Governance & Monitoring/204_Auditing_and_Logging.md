# 204 – Auditing & Logging for Authorization

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Authorization auditing means creating an immutable, structured record of every significant access control decision — who accessed what, when, from where, and whether they were allowed or denied. This serves four purposes: security forensics (trace a breach back to its origin), compliance (GDPR, SOC 2, HIPAA require access logs), operational monitoring (detect anomalies like unusual access patterns), and accountability (prove that sensitive data was only accessed by authorized users). The critical design principle: authorization log entries must be **immutable** (append-only, no update/delete), **structured** (JSON with consistent fields), **complete** (log both allows AND denies), and **protected** (audit logs must themselves be access-controlled).

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### What to Log

Every meaningful authorization decision should produce a log entry with these fields:

```json
{
  "timestamp": "2024-01-15T09:23:11.842Z",  // ISO 8601, UTC
  "requestId": "req_a1b2c3d4",              // correlation across services
  "tenantId": "org_acme",                   // multi-tenant context
  "userId": "user_hruday",                  // who
  "ipAddress": "192.168.1.1",               // where from (hashed for GDPR)
  "userAgent": "Mozilla/5.0...",            // client context
  "action": "invoice:approve",              // what action
  "resource": {                             // what resource
    "type": "Invoice",
    "id": "inv_001",
    "tenantId": "org_acme"
  },
  "decision": "allow",                      // allow | deny
  "decisionReason": "permission_granted",   // why
  "policyVersion": "v2.3.1",               // which policy version
  "sessionId": "sess_xyz",                 // user session correlation
  "environment": {
    "geo": "us-east-1",
    "mfaVerified": true
  }
}
```

### What NOT to Log

- ❌ Passwords or secrets (even hashed — log the event, not the credential)
- ❌ Full PII (log a hash or masked version of PII fields like email, SSN)
- ❌ Session tokens or JWT values (in clear) — these are credentials
- ❌ Request/response bodies for sensitive data operations (unless required by specific compliance standard with appropriate controls)

### Audit Log Architecture

```
API Handler → Authorization Decision → Emit Audit Event
                                              ↓
                                   Message Queue (Kafka/SQS)
                                              ↓
                              ┌───────────────┴──────────────┐
                              ↓                              ↓
                    Audit DB (append-only)          SIEM / Splunk / CloudTrail
                    (Postgres + Row Security)        (Security monitoring)
                              ↓
                    BigQuery / S3 Glacier          (Long-term retention)
```

### Async vs Sync Audit Logging

| Type | When to use | Risk |
|---|---|---|
| Synchronous (in-request) | Compliance-critical ops (financial, PII access) | Adds latency to critical path |
| Asynchronous (event queue) | Standard access events | Small window of potential log loss |
| Fire-and-forget | Low-risk events (read operations) | Log loss on crash |

Best practice: write to an in-request buffer → flush to Kafka → consumer writes to audit DB. This gives near-sync durability without blocking the request path.

### Immutability Patterns

```sql
-- PostgreSQL append-only with Row Level Security
CREATE TABLE audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- all log fields...
);

-- Prevent updates and deletes
CREATE RULE no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;
CREATE RULE no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;

-- Or: use PostgreSQL's pgaudit for database-level auditing
```

### Anomaly Detection Patterns

- **Impossible travel**: user logged in from US then DE within 5 minutes
- **Privilege escalation pattern**: user granted admin then immediately accesses sensitive data
- **Enumeration attack**: 1000 DENY decisions in 60 seconds for one user
- **After-hours access**: sensitive resource accessed at 3 AM for the first time

### Anti-Patterns

- ❌ Logging only denied access (missed: authorized user who stole data)
- ❌ Mutable audit logs (violates tamper-evidence)
- ❌ Single-tenant audit log readable by all tenants
- ❌ No structured logging (free-text makes querying impossible)
- ❌ No retention policy (storage cost explosion + GDPR right to be forgotten conflict)

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG-Scale: AWS CloudTrail

AWS CloudTrail is the canonical cloud audit log. Every API call to every AWS service generates a CloudTrail event — who, what, when, from where. CloudTrail logs are stored in S3 with SSE-KMS encryption, can be validated for integrity, and are readable by AWS CloudWatch and SIEM tools. The CloudTrail log format is the model for structured authorization audit logging.

### FAANG-Scale: Google Cloud Audit Logs

Google Cloud separates audit logs into: Admin Activity (always on, access control changes), Data Access (optional, requires enabling per service), and System Event. Each log entry contains a `principalEmail`, `serviceName`, `methodName`, `resourceName`, `status`, and `authorizationInfo` array showing which IAM permissions were evaluated.

### Hruday @ SAP Labs — BTP Audit Service

At SAP, BTP has a dedicated Audit Log Service — a managed service that all BTP apps write to via the `@sap/audit-logging` SDK. We emitted an audit event for every `invoice:approve` and `user:create` operation. The Audit Log Service stored events in an immutable, tenant-isolated log with 180-day retention. We configured alerts in SAP Alert Notification for any `deny` decision on a financial resource, which triggered incident response workflows.

### Hruday @ Oracle — ERP Compliance Audit

At Oracle, the ERP system generated audit log entries for every record access to sensitive HR fields (compensation, termination). We used Spring Boot's `AOP` (Aspect-Oriented Programming) to intercept service method calls — a `@Auditable` annotation on service methods automatically generated audit events without manual logging in every method. The audit trail was required for SOX compliance and was reviewed quarterly by the audit team.

### Scaling:

At 10M events/day, a simple PostgreSQL audit table starts to grow. Use time-partitioned tables, export to S3 Glacier after 90 days, and use columnar storage (BigQuery, Redshift, Snowflake) for analytics queries. Index on `(tenantId, userId, timestamp)` for per-user audit queries.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Authorization audit logging is about creating an immutable record that answers 'who accessed what, when, and was it allowed?' There are three audiences: security team (breach forensics), compliance auditor (SOC 2, GDPR evidence), and operations (anomaly detection).*

*My audit log schema is structured JSON with: timestamp (ISO UTC), requestId, tenantId, userId, action, resourceType+id, decision (allow/deny), decisionReason, and policyVersion. I never log passwords, tokens, or raw PII — for PII fields I log a pseudonymized identifier or hash.*

*For implementation, I use an AOP interceptor (Spring AOP or NestJS interceptors) to capture audit events at the service boundary, publish them asynchronously to Kafka, and have a consumer write to an append-only audit table. This keeps audit logging off the critical request path. The audit table has database-level rules that prevent DELETE and UPDATE — tamper-evident by construction. I set retention policies: 90 days in hot storage, 7 years in cold storage (S3 Glacier), matching SOC 2 and GDPR retention requirements."*

### Follow-up Questions

1. **"Why log ALLOW decisions, not just DENY?"** — Authorized users who legitimately access data and then misuse it are only visible through allowed-access logs. DENY-only logging misses insider threats.
2. **"How do you make audit logs tamper-evident?"** — Append-only DB with DELETE/UPDATE rules. For stronger guarantees: hash-chain each log entry, or write to an immutable object store (AWS S3 with Object Lock).
3. **"Why is async audit logging dangerous for compliance?"** — A request could complete, data leaked, then the service crashes before the async event is persisted. For compliance-critical events, use synchronous logging or transactional outbox pattern.
4. **"How do you handle right-to-be-forgotten (GDPR) in audit logs?"** — Pseudonymization: instead of storing `userId=john@acme.com`, store a hashed/pseudonymized ID. To fulfill erasure requests, delete the mapping table while keeping the log entry (now anonymized).
5. **"What's the difference between an application log and an audit log?"** — Application logs track system behavior (errors, performance). Audit logs track user behavior with compliance/forensic value. Different storage, retention, access controls, and immutability requirements.

### Comparison Table

| Aspect | Application Logs | Audit Logs |
|---|---|---|
| Purpose | Debug, monitor | Compliance, forensics |
| Immutability | Not required | Required (append-only) |
| Retention | Days/weeks | Years (7 for SOX) |
| PII handling | Redact | Pseudonymize |
| Access control | Ops team | Security/compliance team |
| Query pattern | Text search | Structured query by user/resource |

### Trade-offs

- Synchronous audit logging adds latency; async may lose events on crash — transactional outbox pattern resolves this
- Storing full context (IP, user-agent) aids forensics but conflicts with GDPR data minimization
- Centralized audit log is a single point of compromise — protect it with strict access control and integrity verification

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// NestJS — Audit interceptor (AOP pattern)
export interface AuditEvent {
  timestamp: string;
  requestId: string;
  tenantId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  decision: 'allow' | 'deny';
  decisionReason?: string;
  ipAddress?: string;
  policyVersion?: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly request: REQUEST
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] ?? ulid();

    return next.handle().pipe(
      tap(
        () => this.emitAuditEvent(req, requestId, 'allow'),
        (error) => {
          if (error.status === 403) this.emitAuditEvent(req, requestId, 'deny', error.message);
        }
      )
    );
  }

  private emitAuditEvent(req: any, requestId: string, decision: 'allow' | 'deny', reason?: string) {
    const event: AuditEvent = {
      timestamp: new Date().toISOString(),
      requestId,
      tenantId: req.jwtPayload.tenantId,
      userId: req.jwtPayload.sub,
      action: `${req.method.toLowerCase()}:${req.path}`,
      resourceType: req.params.resource ?? 'unknown',
      resourceId: req.params.id ?? 'unknown',
      decision,
      decisionReason: reason,
      ipAddress: hashIpForGdpr(req.ip),  // pseudonymize for compliance
      policyVersion: process.env.POLICY_VERSION
    };

    // Async publish to Kafka — off critical path
    this.auditService.emit(event).catch((err) => {
      // Log to fallback sync destination if Kafka down
      this.logger.error('Audit log emission failed', { event, err });
    });
  }
}

// Audit DB — append-only PostgreSQL
// CREATE TABLE audit_log (...);
// CREATE RULE no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;
// CREATE RULE no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;

// Audit query — per-user access history
async function getAuditTrail(userId: string, tenantId: string, days = 30) {
  return prisma.auditLog.findMany({
    where: {
      userId,
      tenantId,
      timestamp: { gte: new Date(Date.now() - days * 86400000) }
    },
    orderBy: { timestamp: 'desc' },
    take: 1000
  });
}

// Transactional outbox — guaranteed delivery
// Write audit event to outbox table in same transaction as business operation
async function approveInvoiceWithAudit(
  invoiceId: string,
  userId: string,
  tenantId: string
): Promise<void> {
  await prisma.$transaction([
    prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'approved' } }),
    prisma.auditOutbox.create({
      data: {
        eventType: 'invoice:approve',
        payload: JSON.stringify({ invoiceId, userId, tenantId, timestamp: new Date() }),
        status: 'pending'
      }
    })
  ]);
  // Outbox processor sends to Kafka async — transactionally safe
}
```

**Why this structure:**
- AOP interceptor removes audit logic from every service method — single responsibility
- IP address hashed for GDPR compliance — event still useful for forensics
- Async Kafka publish with sync fallback — off critical path but never lost
- Transactional outbox guarantees audit event is persisted even if Kafka is down

**Interviewer focus:** AOP interceptor pattern, append-only DB rules, IP pseudonymization, transactional outbox

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Audit logs are the black box of access control."** A flight recorder captures everything, is impossible to modify in flight, and is the primary evidence after an incident. Five fields that must always be present: **timestamp**, **who** (userId), **what** (action + resource), **decision** (allow/deny), **requestId** (correlation). Never log credentials or raw PII — pseudonymize. Keep append-only (no UPDATE/DELETE). Use AOP interceptors to avoid manual logging in every service method. Transactional outbox pattern ensures compliance-critical events are never lost.

*If you go blank*: "Audit log = who, what, when, allow/deny. Append-only PostgreSQL. AOP interceptor. IP hashed for GDPR. Async Kafka publish. Transactional outbox for compliance-critical ops."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
- Without audit logs, a security breach cannot be traced — you know you were breached but not what data was accessed, by whom, and for how long
- SOC 2 Type II certification requires demonstrating continuous audit log collection and review — no logs = no certification
- Insider threat detection is only possible with ALLOW-decision logs — employees who legitimately access data and misuse it are invisible without them

**How it works:**
An AOP interceptor (NestJS interceptor, Spring AOP, Express middleware) wraps every protected request. On completion, it constructs a structured audit event with the required fields from the JWT context, request metadata, and authorization decision. The event is published asynchronously to Kafka (or written to a transactional outbox for guaranteed delivery). A consumer writes the event to an append-only audit table protected by database rules that prevent modification.

**Company-specific relevance:**
- **Microsoft**: Azure Activity Log and Azure Audit Logs are foundational security features — all Azure resources produce standardized audit events to Azure Monitor and Log Analytics
- **Adobe**: Adobe Experience Platform has an integrated audit trail for all data governance operations — required by Adobe's enterprise customers for internal compliance
- **Salesforce**: Salesforce Shield Event Monitoring provides field-level audit trails for every record access — audit log capabilities are a paid premium feature indicating enterprise demand
- **Cisco**: Cisco SecureX integrates audit logs from all Cisco security products — authorization decisions across firewalls, intrusion detection, and access control are correlated for threat investigation
