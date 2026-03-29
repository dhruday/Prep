# 205 – Compliance Logging: GDPR & SOC 2

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Compliance logging means structuring your audit trails to meet the specific evidentiary requirements of a regulatory framework. The two frameworks most relevant to enterprise software are **GDPR** (General Data Protection Regulation — EU data privacy law) and **SOC 2** (Service Organization Control 2 — US security/trust standard for SaaS companies). GDPR determines *what you must NOT log* (raw PII), *how long you must retain* data, and the right to erasure. SOC 2 Type II determines *what you MUST log* (specifically logical access events), the *evidence format* auditors require, and the *continuous monitoring* standard. A key engineering tension: GDPR says "minimize data collection," SOC 2 says "collect comprehensive access evidence" — reconciled by pseudonymizing PII in logs while preserving audit utility.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### GDPR & Logging

**GDPR Article 5(1)(e) — Storage Limitation**: Personal data must not be kept longer than necessary for its purpose. For audit logs: define and document the retention period, and automate deletion after it.

**GDPR Article 5(1)(c) — Data Minimisation**: Only collect data adequate and necessary for the purpose. For logs: don't log full IP addresses if a hashed version meets forensic needs. Don't log email addresses when a pseudonymous userId suffices.

**GDPR Article 25 — Privacy by Design**: Pseudonymization must be built in by default. The userId in audit logs should be a stable pseudonymous ID, not a readable email. The mapping between pseudonymous ID and real identity lives in a separate, access-controlled table.

**GDPR Article 17 — Right to Erasure ("Right to be Forgotten")**: When a user requests erasure, you cannot delete audit log entries (they're immutable). Resolution: store only pseudonymized identifiers. To complete erasure, delete the mapping table entry. The audit log entries remain (for tamper-evidence) but are now anonymized — they no longer identify the person.

**GDPR Article 30 — Records of Processing Activities**: Organizations must maintain a record of all processing activities. This is NOT the operational audit log — it's a document describing WHAT data you process, WHY, and on WHAT legal basis. Audit logs provide evidence that the records are accurate.

### SOC 2 & Logging

**SOC 2 Trust Service Criteria (TSC) CC6 — Logical and Physical Access Controls:**

| Criterion | What Auditors Want to See |
|---|---|
| CC6.1 | Logical access restrictions — evidence of role-based access control in place |
| CC6.2 | New access provisioning — log showing who granted what permissions to whom and when |
| CC6.3 | Removal of access — log showing when access was revoked (offboarding) |
| CC6.6 | Boundary enforcement — evidence that north/south and east/west traffic is controlled |
| CC6.7 | Data transmission controls — audit trail for data exports/downloads |
| CC6.8 | Malicious software protection — evidence of controls (not primarily a logging item, but monitoring) |

**SOC 2 CC7 — System Operations (Anomaly Detection):**

- CC7.2 — Evidence that you monitor for security events and respond to anomalies
- Auditors look for: SIEM configuration, alert rules, incident response procedures, log retention proof

**SOC 2 Evidence for Type II Audit**: Type II covers a period (typically 6–12 months). Auditors issue requests ("evidence requests") asking for specific log excerpts. Your logging system must be query-able: "Show me all access events for user X between Jan 1 and March 31", "Show me all role change events in Q1", "Show me all failed login attempts in the period."

### Log Retention Requirements

| Framework | Minimum Retention | Tiered Storage Strategy |
|---|---|---|
| GDPR | No fixed minimum; match to stated purpose (typically 90 days for security, longer with justification) | Hot DB 90 days → Cold S3 1 year |
| SOC 2 | 1 year (covers Type II audit period) | Hot DB 6 months → Cold S3 2 years |
| HIPAA | 6 years from creation or last use | Hot DB 1 year → S3 Glacier 6 years |
| SOX (financial) | 7 years | Hot DB 1 year → S3 Glacier 7 years |
| PCI-DSS | 1 year (3 months online accessible) | Hot Splunk 3 months → Cold 9 months |

### Tamper-Evident Logging (WORM)

Write Once Read Many (WORM) storage prevents log modification:
- **AWS S3 Object Lock** — compliance mode: nobody, including root, can delete or modify objects before retention date
- **Azure Immutable Blob Storage** — time-based retention policies at container level
- **Cryptographic hash chaining** — each log entry includes `SHA256(previousEntryHash + currentEntryContent)`. Modification of any entry breaks all subsequent hashes, proving tampering.

### PII Pseudonymization Strategy

```
Real identity:     email=hruday@acme.com, ip=185.22.33.44
Stored in logs:    userId=pseu_a9f3c1b2, ip=193.22.x.x  ← hashed/masked

Mapping table (separate, access-controlled):
  pseu_a9f3c1b2 → hruday@acme.com  ← deleted on GDPR erasure request

After erasure request:
  Log entry still exists (tamper-evident)
  But userId=pseu_a9f3c1b2 no longer maps to any real person
  → Log is now anonymized, not personal data
```

### Anti-Patterns

- ❌ Storing raw email addresses in audit log fields — violates GDPR data minimization
- ❌ Deleting audit log entries for GDPR erasure — breaks tamper-evidence; use pseudonymization instead
- ❌ One global retention policy ("delete everything after 30 days") — fails SOC 2 / SOX
- ❌ Storing logs in the same application DB without access separation — internal users could query sensitive access patterns

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG-Scale: Google Cloud — GDPR Data Residency + Audit Logs

Google Cloud allows customers to configure Data Residency restrictions — audit log data stays within EU regions for GDPR compliance. Google Workspace provides a configurable audit log exporter with field-level PII controls: administrators can mask or exclude PII from exported logs before they leave Google's infrastructure.

### FAANG-Scale: Salesforce Shield Compliance

Salesforce Shield Transaction Security and Event Monitoring provide SOC 2 evidence out of the box. Salesforce maintains its own SOC 2 Type II certification, covering the infrastructure their customers' data sits on. Enterprise customers use Shield to log field-level access for HIPAA and GDPR audits — capturing exactly which user accessed a field containing PHI or PII, with a pseudonymized identifier option in newer releases.

### Hruday @ SAP Labs — BTP GDPR-Compliant Audit Service

At SAP, the BTP Audit Log Service was designed with GDPR from the ground up. We used the `@sap/audit-logging` SDK which had a built-in pseudonymization mode: PII attributes were wrapped in `pseudonymous(value)` calls, and the SDK handled the pseudonymization + mapping table automatically. When a customer exercised their GDPR erasure right, SAP's data deletion tooling deleted the mapping table entry. The audit log entries remained valid (tamper-evident) but were effectively anonymized. We configured audit log retention at 90 days for security events, 2 years for data access events (required by our FSI customers for regulatory audits).

### Hruday @ Oracle — SOC 2 Evidence Collection

At Oracle, the SaaS application underwent annual SOC 2 Type II audit. During evidence collection periods, I worked with the compliance team to run structured queries against our audit DB: "all role change events in the audit period", "all access events to compensation data". We had a dedicated `ComplianceQueryService` that wrapped these queries with the correct tenant isolation and time constraints. The queries returned structured JSON that was exported directly to the auditor's evidence management system. This saved significant manual effort compared to ad-hoc log searches.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Compliance logging bridges security audit trails and regulatory requirements. GDPR and SOC 2 have partially conflicting requirements that need careful design to satisfy simultaneously.*

*For GDPR: I never store raw PII in audit logs. I use pseudonymous IDs — a stable hash that uniquely identifies a user for forensic purposes but cannot be reverse-engineered without the mapping table. For GDPR erasure requests, I delete the mapping table entry; the audit log entry remains (for tamper-evidence) but is now anonymized. For retention, I match the stated purpose — security events at 90 days, data access events at up to 2 years when required by enterprise customers.*

*For SOC 2: I ensure CC6 criteria are covered — every role provisioning, access grant, and access revocation generates a structured log entry. For Type II audit, I expose a `ComplianceQueryService` that lets the compliance team run auditor evidence queries ('all role changes in Q1', 'all accesses to PII fields by userId X') without giving them direct DB access.*

*The key insight I implemented at SAP: store the audit log and the pseudonymization mapping table with different access controls. Application services can write to both, but only the compliance team can read the mapping table to de-pseudonymize for investigation — and that access itself generates an audit event.*"

### Follow-up Questions

1. **"How do you handle GDPR erasure requests when audit logs must be immutable?"** — Pseudonymization pattern: don't store PII in the log, store a pseudonymous ID. Delete only the mapping table entry. The log entry becomes anonymized (no longer personal data under GDPR) without modifying it.
2. **"What evidence does a SOC 2 auditor actually look for?"** — Evidence of: who has access to what systems (access matrix), a log proving access is granted through a formal process, a log proving access is revoked on offboarding, a sample of access events showing only authorized users accessed sensitive data.
3. **"How do you implement WORM (Write Once Read Many) for audit logs?"** — Cloud: AWS S3 Object Lock in compliance mode, Azure Immutable Blob Storage. Self-hosted: PostgreSQL with DELETE/UPDATE rules + periodic export to S3 with Object Lock.
4. **"Which regulation has the longest retention requirement?"** — SOX (Sarbanes-Oxley) for financial records: 7 years. HIPAA: 6 years from creation. PCI-DSS: 1 year. GDPR: no fixed minimum, match to stated purpose.
5. **"How do you avoid PCI-DSS violations in logs?"** — Never log payment card numbers. Even in encrypted form. If a card number could conceivably appear in a request body (e.g. a form field), strip request body logging for payment endpoints. Log only transaction IDs and masked card last-4.

### Comparison Table

| Requirement | GDPR | SOC 2 | HIPAA | PCI-DSS |
|---|---|---|---|---|
| Log PII | ❌ Minimize; pseudonymize | ✅ Required (user identity) | ✅ Required (pseudonymized) | ❌ Never card data |
| Retention minimum | Purpose-limited | 1 year | 6 years | 1 year |
| Right to erasure | ✅ Must support | N/A | N/A | N/A |
| Immutability | ✅ Via pseudonymization | ✅ Must show logs are reliable | ✅ Integrity required | ✅ Required |
| SIEM integration | Recommended | ✅ Required evidence | ✅ Required | ✅ Required |
| Audit period | Ongoing | 6–12 month window | Ongoing | Quarterly |

### Trade-offs

- Pseudonymization adds a lookup step to investigations; strongly consistent hashing enables investigations without a round-trip to the mapping table for non-erasure scenarios
- WORM storage costs more; tiered storage (S3 Standard → Glacier) reduces cost while maintaining compliance
- Comprehensive logging satisfies SOC 2 but increases storage and processing cost — optimize with structured queries over columnar storage (BigQuery, Redshift)

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// GDPR-compliant pseudonymized audit logger
import { createHash } from 'crypto';

function pseudonymize(value: string, tenantId: string): string {
  // HMAC with tenant-specific salt — stable across requests, not reversible without salt
  return createHash('sha256').update(`${tenantId}:${value}:${process.env.PSEUDONYM_SALT}`).digest('hex').slice(0, 16);
}

// Audit event writer — pseudonymizes PII before storage
export class GdprCompliantAuditService {
  async write(event: RawAuditEvent): Promise<void> {
    const pseudoEvent: AuditLogEntry = {
      ...event,
      userId:    pseudonymize(event.userId, event.tenantId),    // PII → pseudonymous
      ipAddress: maskIp(event.ipAddress),                       // 185.22.33.44 → 185.22.x.x
      // NOTE: email, name, phone never stored in audit log at all
    };

    // Write to append-only table — same as 204
    await this.auditRepo.insertOne(pseudoEvent);
  }

  // For security investigation: de-pseudonymize WITH audit trail
  // requires ComplianceTeam role — access itself is audited
  async resolveIdentity(pseudoId: string, tenantId: string, investigationRef: string): Promise<string> {
    // This lookup is ITSELF logged (meta-audit)
    await this.metaAuditLog.write({ action: 'pseudonym:resolve', pseudoId, investigationRef });
    return this.mappingRepo.findByPseudoId(pseudoId, tenantId);
  }
}

// SOC 2 CC6 Evidence Query Service
export class ComplianceQueryService {
  // CC6.2 — Access provisioning evidence
  async getRoleProvisioningLog(from: Date, to: Date, tenantId: string): Promise<AuditLogEntry[]> {
    return this.auditRepo.query({
      tenantId,
      action: { in: ['user:grant_role', 'permission:create', 'access:provision'] },
      timestamp: { gte: from, lte: to }
    });
  }

  // CC6.3 — Access revocation evidence
  async getRevocationLog(from: Date, to: Date, tenantId: string): Promise<AuditLogEntry[]> {
    return this.auditRepo.query({
      tenantId,
      action: { in: ['user:revoke_role', 'access:revoke', 'user:offboard'] },
      timestamp: { gte: from, lte: to }
    });
  }

  // CC7.2 — Anomaly detection evidence: users with >100 deny decisions
  async getHighDenyUsers(from: Date, to: Date, tenantId: string): Promise<UserDenySummary[]> {
    return this.auditRepo.aggregateByUser({
      tenantId,
      decision: 'deny',
      timestamp: { gte: from, lte: to },
      havingCount: { gte: 100 }
    });
  }
}

// Retention policy enforcer — runs nightly
export async function enforceRetentionPolicies(): Promise<void> {
  const policies = [
    { category: 'security_event', retentionDays: 90,   region: 'EU'  },  // GDPR
    { category: 'data_access',    retentionDays: 365,  region: 'US'  },  // SOC 2
    { category: 'financial_op',   retentionDays: 2555, region: 'ALL' },  // SOX (7yr)
  ];

  for (const policy of policies) {
    const cutoff = new Date(Date.now() - policy.retentionDays * 86400000);
    // Move to cold storage (S3 Glacier), don't delete — WORM
    await archiver.moveToGlacier({
      category: policy.category,
      olderThan: cutoff,
      destination: `s3://audit-glacier/${policy.category}/`
    });
  }
}
```

**Why this structure:**
- `pseudonymize()` uses HMAC with tenant-specific salt — deterministic (same input → same output, enabling correlation) but not reversible
- `resolveIdentity()` is itself audited — reading the mapping table creates a meta-audit event
- `ComplianceQueryService` wraps all SOC 2 evidence queries with proper tenant isolation
- Retention enforcer archives to WORM S3 Glacier — not deleted, just inaccessible for modification

**Interviewer focus:** HMAC-based pseudonymization, meta-audit for identity resolution, SOC 2 CC6 query patterns, tiered retention by category + region

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"GDPR says minimize; SOC 2 says prove."** The tension is resolved by pseudonymization: store enough to prove access for SOC 2, but not enough to identify the person for GDPR. Five key facts: (1) pseudonymize PII with HMAC+salt — stable but not reversible; (2) erasure = delete the mapping, not the log; (3) SOC 2 CC6 needs role provisioning + revocation logs; (4) SOX = 7 years, HIPAA = 6, SOC 2 = 1; (5) WORM storage (S3 Object Lock) for tamper-evidence.

*If you go blank*: "GDPR: pseudonymize PII, right to erasure via mapping table deletion. SOC 2: role grant/revoke logs for CC6, 1-year retention. SOX: 7 years. WORM storage for tamper-evidence."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
- GDPR non-compliance carries fines up to 4% of global annual revenue — storing raw email addresses in audit logs is a GDPR violation with real financial risk
- SOC 2 Type II certification is a commercial requirement for enterprise SaaS sales — without it, large enterprise customers (banks, insurance, government) will not sign contracts
- WORM storage + hash chaining is legally required in regulated industries — if audit logs can be modified, they cannot be used as evidence in a legal dispute or regulatory investigation

**How it works:**
PII is pseudonymized (HMAC with tenant-scoped salt) before being written to the audit log. The real-identity mapping table is stored separately with stricter access controls; access to the mapping table is itself audited. For GDPR erasure, only the mapping table entry is deleted — the audit log entry remains (tamper-evident) but is now anonymized. SOC 2 evidence is served by a dedicated `ComplianceQueryService` that runs pre-built queries against the structured audit log, producing machine-readable evidence exports for auditors.

**Company-specific relevance:**
- **Microsoft**: Azure Compliance Manager maps SOC 2 and GDPR controls to specific Azure services, including Defender for Cloud and Purview audit logs — Microsoft's enterprise customers use this for continuous compliance monitoring
- **Adobe**: Adobe Experience Platform's Data Governance framework enforces DULE (Data Usage Labeling and Enforcement) policies — audit logs record every data access decision against a labeled dataset, supporting GDPR and CCPA compliance evidencing
- **Salesforce**: Salesforce holds its own SOC 2 Type II, ISO 27001, and PCI-DSS certifications — Shield Event Monitoring is the mechanism by which Salesforce customers extend compliance coverage to their custom application layer
- **Cisco**: Cisco Secure Network Analytics (formerly Stealthwatch) aggregates network flow logs for SOC 2 CC7 anomaly detection evidence — combined with Cisco ISE access control audit logs, it provides the complete CC6+CC7 evidence set enterprise auditors require
