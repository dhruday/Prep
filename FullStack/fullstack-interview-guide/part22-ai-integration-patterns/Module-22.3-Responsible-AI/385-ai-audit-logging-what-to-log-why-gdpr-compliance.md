# AI Audit Logging — What to Log, Why, GDPR Compliance Angle
> Part 22 — AI Integration Patterns · Responsible AI
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Log metadata, not content**: log the hash of the prompt (SHA-256), not the actual prompt text — the prompt may contain PII or confidential business information; the hash lets you correlate events without storing sensitive content
- **What to log**: `requestId`, `userId`, `tenantId`, `featureId`, `promptHash` (SHA-256), `inputTokens`, `outputTokens`, `modelUsed`, `modelVersion`, `latencyMs`, `finishReason`, `costUsd`, `cacheHit`, `timestamp`, `ipAddress`, `userAgent`, guardrail block reason if any
- **What NOT to log**: the actual prompt text, the actual LLM response text, any PII from the input or output; these are the vectors for compliance violations in audit logs themselves
- **GDPR angle**: audit logs are data under GDPR too; apply data minimisation to them; EU users' logs must respect Article 5(1)(e) storage limitation — define a retention policy (90 days default; legal hold extends it); logs must be stored in EU region for EU users; users have a right to erasure that covers audit logs too (anonymise logs on deletion request, since full erasure breaks audit trail integrity)
- **India DPDP Act 2023**: requires organisations to implement "reasonable security safeguards"; AI audit logs demonstrating what decisions were made and why serve as evidence of compliance; consent for AI processing can be tracked here (consentId field in audit record)
- **Spring AOP approach**: write a single `@Around` advice on `AiService` methods — all AI calls get logged without touching individual call sites; intercept → extract → call → write audit record → return

---

## 1. One-Line Definition
AI audit logging is recording the metadata of every LLM interaction — who requested what, with which model, at what cost, with what result — without logging the actual content, so you have a compliance trail without creating a new PII liability.

---

## 2. What to Log vs What Not to Log

```
AI AUDIT LOG — FIELD TAXONOMY

✅ LOG THESE (metadata, no PII)
  requestId          UUID per API call — links frontend error to backend trace
  userId             Internal user identifier (not email — internal ID)
  tenantId           For multi-tenant SaaS; enables per-tenant cost/incident audit
  featureId          Which product feature triggered the call (chat, search, moderation)
  promptHash         SHA-256 of full prompt + system message (for integrity, not content)
  inputTokens        From response.usage().inputTokens()
  outputTokens       From response.usage().outputTokens()
  modelUsed          e.g. "gpt-4o-mini-2024-07-18" — exact pinned version
  latencyMs          End-to-end call duration including guardrail overhead
  finishReason       "STOP" / "LENGTH" / "CONTENT_FILTER" / "TOOL_CALLS"
  costUsd            Calculated: (inputTokens × inputPrice) + (outputTokens × outputPrice)
  cacheHit           Boolean — was this served from semantic cache?
  guardrailBlocked   Boolean — was the request or response blocked by guardrails?
  guardrailReason    Code (INPUT_TOO_LONG, PII_DETECTED, CONTENT_POLICY, etc.)
  ipAddress          Request source (anonymise last octet for GDPR: 192.168.1.x → 192.168.1.0)
  timestamp          ISO-8601 UTC
  consentId          Link to consent record (DPDP Act compliance)

❌ NEVER LOG THESE
  prompt text        May contain PII, trade secrets, confidential queries
  response text      Derivative of confidential user data; GDPR data itself
  embedding vectors  If derived from user content — this is personal data
  raw file contents  For document Q&A features — user's documents are their data
```

---

## 3. Database Schema and Repository

```java
// database/V1_1__ai_audit_log.sql (Flyway migration)
CREATE TABLE ai_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id      UUID NOT NULL,
    user_id         VARCHAR(64) NOT NULL,
    tenant_id       VARCHAR(64),
    feature_id      VARCHAR(64) NOT NULL,
    prompt_hash     CHAR(64) NOT NULL,              -- SHA-256 hex
    model_used      VARCHAR(80) NOT NULL,
    model_version   VARCHAR(80) NOT NULL,
    input_tokens    INTEGER,
    output_tokens   INTEGER,
    latency_ms      INTEGER,
    finish_reason   VARCHAR(32),
    cost_usd        DECIMAL(12, 8),
    cache_hit       BOOLEAN DEFAULT FALSE,
    guardrail_blocked BOOLEAN DEFAULT FALSE,
    guardrail_reason VARCHAR(64),
    ip_address      INET,                           -- Postgres INET type; store anonymised
    consent_id      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- GDPR retention support
    retain_until    TIMESTAMPTZ GENERATED ALWAYS AS (created_at + INTERVAL '90 days') STORED
);

CREATE INDEX idx_audit_user_id ON ai_audit_log(user_id);
CREATE INDEX idx_audit_tenant_id ON ai_audit_log(tenant_id);
CREATE INDEX idx_audit_feature_created ON ai_audit_log(feature_id, created_at DESC);

-- Automated deletion job: DELETE WHERE retain_until < NOW() AND legal_hold = FALSE
ALTER TABLE ai_audit_log ADD COLUMN legal_hold BOOLEAN DEFAULT FALSE;
```

```java
public record AiAuditRecord(
    UUID requestId,
    String userId,
    String tenantId,
    String featureId,
    String promptHash,          // SHA-256 hex
    String modelUsed,
    String modelVersion,
    Integer inputTokens,
    Integer outputTokens,
    Integer latencyMs,
    String finishReason,
    BigDecimal costUsd,
    boolean cacheHit,
    boolean guardrailBlocked,
    String guardrailReason,
    String ipAddress,           // Anonymised: last octet zeroed
    UUID consentId,
    Instant createdAt
) {
    public static String hashPrompt(String systemPrompt, String userMessage) {
        String combined = systemPrompt + "\n" + userMessage;
        return DigestUtils.sha256Hex(combined);
    }
    
    public static String anonymiseIp(String ipAddress) {
        // IPv4: zero last octet. IPv6: zero last 64 bits.
        if (ipAddress == null) return null;
        if (ipAddress.contains(".")) {
            int lastDot = ipAddress.lastIndexOf('.');
            return ipAddress.substring(0, lastDot) + ".0";
        }
        // IPv6 — simplify for brevity
        return ipAddress.substring(0, ipAddress.indexOf(':', 8) + 1) + ":/64";
    }
}
```

---

## 4. Spring AOP Audit Interceptor

```java
@Aspect
@Component
@Slf4j
public class AiAuditAspect {

    private final AiAuditRepository auditRepository;
    private final HttpServletRequest httpRequest;
    private final ModelCostConfig costConfig;
    
    @Around("@annotation(AiAudited)")
    public Object auditAiCall(ProceedingJoinPoint pjp) throws Throwable {
        long startMs = System.currentTimeMillis();
        UUID requestId = UUID.randomUUID();
        AiCallContext ctx = extractCallContext(pjp.getArgs());
        
        try {
            Object result = pjp.proceed();
            long latencyMs = System.currentTimeMillis() - startMs;
            
            if (result instanceof AiCallResult aiResult) {
                writeAuditRecord(requestId, ctx, aiResult, latencyMs, null);
            }
            return result;
            
        } catch (Exception e) {
            long latencyMs = System.currentTimeMillis() - startMs;
            writeAuditRecord(requestId, ctx, null, latencyMs, e.getClass().getSimpleName());
            throw e;
        }
    }
    
    private void writeAuditRecord(UUID requestId, AiCallContext ctx, 
            AiCallResult result, long latencyMs, String errorType) {
        
        Usage usage = result != null ? result.usage() : null;
        String modelUsed = result != null ? result.modelUsed() : ctx.modelUsed();
        BigDecimal cost = usage != null 
            ? costConfig.calculate(modelUsed, usage.inputTokens(), usage.outputTokens())
            : BigDecimal.ZERO;
        
        AiAuditRecord record = new AiAuditRecord(
            requestId,
            ctx.userId(),
            ctx.tenantId(),
            ctx.featureId(),
            AiAuditRecord.hashPrompt(ctx.systemPrompt(), ctx.userMessage()),
            modelUsed,
            modelUsed, // pinned version = same field in this design
            usage != null ? usage.inputTokens() : null,
            usage != null ? usage.outputTokens() : null,
            (int) latencyMs,
            result != null ? result.finishReason() : "ERROR",
            cost,
            result != null && result.cacheHit(),
            ctx.guardrailBlocked(),
            ctx.guardrailReason(),
            AiAuditRecord.anonymiseIp(httpRequest.getRemoteAddr()),
            ctx.consentId(),
            Instant.now()
        );
        
        // Write async — don't block the response on audit write
        CompletableFuture.runAsync(() -> auditRepository.save(record));
    }
}

// Apply to service methods
@AiAudited
public AiCallResult generateResponse(AiCallContext ctx) { ... }
```

---

## 5. Wrong Way vs Right Way

```java
// ❌ Logging actual prompt and response text
@Service
public class AiService {
    public String chat(String userId, String userMessage) {
        log.info("AI call: userId={} message='{}' response='{}'", 
            userId, userMessage, response);  // ← PII in logs; GDPR violation
        return response;
    }
}
```

```java
// ✅ Logging metadata only; hash for integrity; anonymised IP
@AiAudited  // AOP handles all audit logic; zero audit boilerplate in service
@Service
public class AiService {
    public AiCallResult chat(AiCallContext ctx) {
        // Business logic only; audit aspect captures all metadata automatically
        GuardrailResult input = guardrails.validateInput(ctx);
        if (!input.allowed()) {
            return AiCallResult.blocked(input.userMessage(), ctx.withGuardrailBlock(input));
        }
        return callLlm(ctx.withSanitisedInput(input.sanitisedInput()));
    }
}
```

---

## 6. GDPR Compliance Checklist

```
AI AUDIT LOG — GDPR COMPLIANCE CHECKLIST

☐ Data minimisation (Art. 5(1)(c))
    Only metadata in logs — no prompt text, no response text, no PII

☐ Storage limitation (Art. 5(1)(e))
    retain_until = created_at + 90 days (configurable; legal hold flag for disputes)

☐ Data residency
    EU users' audit logs stored in EU region (separate DB schema or separate DB instance)

☐ Right to erasure (Art. 17)
    On deletion request: anonymise user_id → SHA256(userId + salt), NULL out ip_address
    Do NOT delete rows — breaking audit trail integrity is worse than anonymisation
    
☐ Right to access (Art. 15)
    Endpoint: GET /api/users/me/ai-activity — returns audit records for that user
    Returns: featureId, timestamp, modelUsed, latencyMs, cacheHit — nothing more

☐ Data Processing Agreement with LLM provider
    OpenAI: requires sign of DPA for GDPR compliance; available in account settings
    Azure OpenAI: DPA covered under Microsoft Enterprise Agreement
    Log the DPA version in audit trail (for audit purposes; legal team requirement)
```

---

## 7. Scale Evolution

**Prototype →** Write audit records to a single Postgres table via Spring JPA; JSON log line via SLF4J MDC.

**Production →** Async write via `CompletableFuture`; separate `ai_audit_log` table with partition by month; Elastic Stack ingestion for dashboards (cost per feature, model usage distribution, error rates); automated 90-day deletion job.

**High scale →** Kafka audit event stream (`ai-audit-events` topic); Audit Consumer writes to cold storage (S3 Parquet); hot path writes summary metrics to Prometheus only; data lake for compliance queries; separate EU and non-EU Kafka clusters for data residency.

---

## 8. Company Relevance

| Company | Audit logging context | Interview signal |
|---------|---------------------|-----------------|
| Razorpay / PhonePe | RBI audit requirements; financial AI decisions must be traceable | Audit trail for every AI-influenced risk/fraud decision; `consentId` for UPI consent |
| Swiggy / Meesho | DPDP Act 2023 compliance for consumer apps; AI personalisation audit | Consent tracking in audit records; right-to-erasure anonymisation flow |
| Adobe / Microsoft | Enterprise — SOC2 and ISO 27001 customers ask for audit logs in sales cycle | Log export API for enterprise customers; DPA records management |
| SAP Labs | Enterprise SaaS — multiple clients, each tenant's AI usage auditable separately | `tenantId` in every audit record; per-tenant cost reports; legal hold per tenant |

---

## 9. Interview Questions & Model Answers

### Q1 — What do you log for AI calls and what do you deliberately not log?
**Hruday:**
> "I log metadata only — never the actual prompt text or response text. The fields I capture are: a UUID request ID, internal user and tenant IDs, the feature ID that triggered the call, a SHA-256 hash of the prompt and system message combined (this lets me correlate events without storing the content), the exact pinned model version, input and output token counts, latency in milliseconds, finish reason from the API, calculated cost in USD, whether it was a cache hit, whether a guardrail blocked it, and the anonymised IP address with the last octet zeroed. The reason I don't log prompt and response text is that they almost always contain PII or confidential business content — logging them creates a new GDPR liability in the audit system itself. Instead I hash the prompt, so if a specific prompt is under investigation I can SHA-256 the known prompt text and look up all matching events. For retention, I add a `retain_until` column set to 90 days from creation, with an automated deletion job. When a user requests erasure under GDPR, I anonymise the `user_id` field to the hash of their ID plus a salt rather than deleting the row, because deleting audit records breaks integrity and could be a bigger compliance issue. For implementation, I write a Spring AOP `@Around` advice so every AI service method gets audited with zero boilerplate at the call site."

---

*Part 22 · AI Audit Logging — What to Log, Why, GDPR Compliance Angle · Full Stack Interview Guide · Hruday D · 2026*
