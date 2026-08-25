# 203 – Authorization at Scale

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Authorization at scale is the engineering challenge of evaluating permission checks for millions of users per second without becoming the performance bottleneck. The key insight from systems like Google Zanzibar and AWS IAM is that authorization must be treated as a **first-class distributed infrastructure concern** — not application code. At scale, this means: externalizing the policy engine (OPA clusters, Zanzibar-style ACL stores), aggressively caching permission decisions, designing for eventual consistency with bounded staleness, and optimizing the critical path so that a permission check adds no more than 1-2ms to request latency. The most important architectural decision is choosing between a **push model** (permissions baked into JWTs at login) and a **pull model** (check an external authorization service per request).

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Push vs Pull Authorization Model

```
PUSH MODEL (JWT claims)
  Login → IdP evaluates permissions → encodes into JWT
  API request → JWT validated locally → O(1) permission check
  ✅ Zero latency, no external call
  ❌ Stale until token refresh, JWT size grows with permissions

PULL MODEL (External authorization service)
  API request → service calls OPA / Zanzibar / permission API
  ✅ Always fresh, centralized policy
  ❌ Adds network hop (1-5ms), single point of failure risk
```

### Hybrid: JWT + Remote Check for Sensitive Operations

```
Standard check: verify JWT claims (push model, <0.1ms)
Sensitive check: call OPA sidecar (pull model, <2ms)

Threshold: if financial amount > $10K → always pull-check
           else → trust JWT claims
```

### OPA at Scale

Open Policy Agent (OPA) can be deployed as:
1. **Sidecar** — one OPA per service instance (zero network hop, local call)
2. **Central cluster** — external OPA cluster (network hop, centralized)
3. **Compiled Wasm** — policy compiled to WebAssembly, embedded in the app (fastest, no network)

At Google-scale:
- OPA sidecar: ~0.5ms per decision
- Central OPA: ~2-5ms per decision
- Compiled Wasm: ~0.05ms per decision

### Google Zanzibar-Inspired Design

Zanzibar uses a **relational tuple store** for ACL evaluation:

```
user:alice#reader → doc:budget_2024
group:finance#member → user:alice
```

Evaluation: "Can alice read doc:budget_2024?" resolves through the group membership chain. This is what ReBAC (Relationship-Based Access Control) looks like at scale — used by Google Drive, GitHub's SpiceDB, Authzed.

### Authorization Service Failure Modes

| Scenario | Response Strategy |
|---|---|
| Authorization service down | Circuit breaker → fail-open or fail-closed based on risk |
| High latency spike | Timeout + fallback to cached decision |
| Cache stale | Accept bounded staleness (Zanzibar uses "zookie" consistency token) |

### Performance Benchmarks (Typical at 10M DAU)

| Approach | P99 Latency | Throughput | Staleness |
|---|---|---|---|
| JWT claim check | <0.1ms | Millions/sec | Token TTL |
| Redis cache | <1ms | 100K/sec | 5 min |
| OPA sidecar | ~0.5ms | 50K/sec | Policy reload interval |
| OPA cluster | ~3ms | 20K/sec per node | Policy reload interval |
| DB direct | ~5-20ms | 5K/sec | Real-time |

### Horizontal Scaling Considerations

- OPA is stateless — horizontally scalable behind a load balancer
- Bundle server provides policy updates without restarting OPA instances
- Permission DB: read replicas for authorization queries + write to primary

### Anti-Patterns

- ❌ Database query per permission check with no caching at high scale
- ❌ Single point of failure authorization service with no circuit breaker
- ❌ Large permission sets in JWT (JWT > 8KB causes browser cookie issues)
- ❌ No SLO for authorization service (treat like any core infrastructure)
- ❌ Policy changes that require redeploys (externalize policy to OPA/bundle)

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG-Scale: Google Zanzibar

Google Zanzibar handles billions of ACL checks per second across Google Drive, Maps, Calendar, YouTube. Key innovations: (1) relational tuple store for ACL modeling; (2) consistency tokens ("zookies") that give callers control over the staleness tradeoff; (3) Leopard indexing system for deep group membership chains; (4) aggressive multi-layer caching. Published as a research paper in 2019, it spawned SpiceDB, Authzed, and OpenFGA.

### FAANG-Scale: Netflix + OPA

Netflix deployed OPA as a centralized policy service for all microservices. Their engineering blog documents moving from ad-hoc authorization to OPA, achieving policy-as-code with unit testing, CI/CD for policy changes, and consistent enforcement across 100+ microservices. Netflix's OPA deployment handles millions of policy evaluations per minute.

### Hruday @ SAP Labs — BTP Scale

At SAP, our BTP services at regional scale handled authorization via a Redis-cached permission service. With 50K concurrent users across 200 tenants, we achieved a 95% cache hit rate, reducing our PostgreSQL permission queries from ~500K/hour to ~25K/hour. We instrumented OPA as a sidecar for complex ABAC policies (cross-tenant sharing, document classification checks), with sub-1ms P99 latency from OPA via localhost calls.

### Engineering Math:

- 10M DAU × 100 API calls/day = 1B authorization checks/day = ~11,600/second
- DB direct at 5ms = ~200ms per request budget consumed on auth alone
- Redis cache (95% hit rate) reduces DB load to 580/second — feasible
- OPA sidecar at 0.5ms = adds only 0.5ms to request latency

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Authorization at scale requires treating permission checks as infrastructure, not application logic. The starting point is understanding the push vs pull tradeoff: push model (JWT claims) gives zero-latency permission checks but has bounded staleness; pull model (external authorization service like OPA) gives fresh decisions but adds network latency.*

*My preference at scale is a hybrid: JWT claims for standard checks (O(1), <0.1ms — handles 90% of requests), plus an OPA sidecar for complex ABAC/policy decisions and sensitive operations. OPA as a sidecar means authorization stays on localhost — no network hop, no external failure mode.*

*The performance math matters in interviews: at 10M DAU making 100 API calls each, that's 11,600 authorization checks per second. A Redis cache with 95% hit rate reduces DB load to 580 queries/second — perfectly feasible. I instrument authorization latency as a P99 metric and set an SLO: authorization must never add more than 2ms to P99 request latency."*

### Follow-up Questions

1. **"What's the difference between OPA sidecar and OPA cluster?"** — Sidecar: one OPA per service, no network hop, sub-1ms. Cluster: external OPA instances behind LB, ~2-5ms, centralized for cross-service consistency.
2. **"How does Google Zanzibar differ from RBAC?"** — Zanzibar implements ReBAC (Relationship-Based): permissions expressed as tuples (user:alice#reader → doc:X). Supports group membership chains, delegation. More expressive than flat RBAC.
3. **"What's a 'zookie' and why does it matter?"** — A Zanzibar consistency token. Gives clients control over the freshness/performance tradeoff: "check permissions as of at least this point in time" vs "use cached decision."
4. **"How do you handle OPA being down?"** — Circuit breaker: if OPA is unreachable, decide based on risk profile. For non-sensitive routes → fail-open (allow with log). For sensitive (delete, financial) → fail-closed (deny with retry-after).
5. **"How big can JWT permission claims get?"** — JWT is Base64-encoded, HTTP header limit prevents tokens beyond ~8KB in many proxies. At >100 permissions, JWT approach breaks. Switch to permission IDs in JWT + server-side expansion on cache miss.

### Comparison Table

| Model | Latency | Freshness | Failure impact | Best for |
|---|---|---|---|---|
| JWT claims | <0.1ms | Token TTL | None | Standard checks, 90% of cases |
| Redis cache | <1ms | 5 min | Fallback to DB | Most API services |
| OPA sidecar | ~0.5ms | Policy reload | Local failure only | Complex ABAC |
| OPA cluster | ~3ms | Near-real-time | Network failure risk | Cross-service policy |
| DB direct | 5-20ms | Real-time | DB bottleneck | Only for sensitive ops |

### Trade-offs

- Policy as code (OPA) enables CI/CD for authorization rules — testable, version-controlled, peer-reviewed
- JWT push is fast but JWT size grows with permissions — set a hard limit (100 permissions max)
- Eventual consistency in permission decisions is acceptable for most operations; for financial/compliance operations, always use pull with fresh check

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Hybrid authorization: JWT claims + OPA for complex policies
@Injectable()
export class HybridAuthorizationService {
  constructor(
    private readonly opaClient: OpaClient,
    private readonly jwtClaims: JwtClaimsService,
    private readonly cache: PermissionCacheService
  ) {}

  async check(input: AuthzInput): Promise<boolean> {
    // FAST PATH: JWT claims for simple permission checks (<0.1ms)
    if (input.type === 'simple_permission') {
      return this.jwtClaims.hasPermission(input.permission);
    }

    // MEDIUM PATH: Redis cache for known permission sets (<1ms)
    if (input.type === 'cached') {
      return this.cache.has(input.userId, input.tenantId, input.permission);
    }

    // SLOW PATH: OPA sidecar for complex ABAC policies (~0.5ms)
    if (input.type === 'policy') {
      return this.checkWithOPA(input);
    }

    throw new Error(`Unknown authorization type: ${input.type}`);
  }

  private async checkWithOPA(input: AuthzInput): Promise<boolean> {
    const startTime = performance.now();
    try {
      const result = await this.opaClient.evaluate({
        policy: input.policy,  // e.g., 'authz/invoice/approve'
        input: {
          user: { id: input.userId, permissions: input.userPermissions, tenantId: input.tenantId },
          resource: input.resource,
          action: input.action,
          environment: { time: new Date().toISOString() }
        }
      });

      const latency = performance.now() - startTime;
      this.metrics.recordAuthzLatency('opa', latency);

      return result.allow === true;
    } catch (error) {
      // Circuit breaker: fail-closed for sensitive operations
      if (input.failClosed) return false;
      // Fail-open for low-risk operations: log and allow
      this.logger.warn('OPA unavailable, failing open', { input });
      return true;
    }
  }
}

// OPA policy — Rego
// package authz.invoice.approve
// allow {
//   input.user.permissions[_] == "invoice:approve"
//   input.resource.department == input.user.department
//   input.resource.amount <= 50000
//   time.now_ns() < input.resource.approvalDeadline
// }

// Performance monitoring
@Injectable()
export class AuthzMetricsService {
  recordAuthzLatency(method: string, ms: number): void {
    histogram.observe({ method }, ms);
    if (ms > 2) {
      this.alerting.warn(`Auth ${method} latency ${ms}ms exceeds 2ms SLO`);
    }
  }
}
```

**Why this structure:**
- Three-tier dispatch (JWT → Cache → OPA) ensures minimal latency for common cases
- Circuit breaker with `failClosed` parameter lets callers declare risk tolerance
- Latency recording enables SLO monitoring — authorization latency is treated as infrastructure metric
- OPA input structure matches Rego policy variables — explicit and testable

**Interviewer focus:** Push vs pull tradeoff, OPA sidecar vs cluster, circuit breaker, latency SLO, performance math

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Authorization = infrastructure, not business logic."** Three tiers: JWT claims (push, <0.1ms, 90% of cases), Redis cache (pull cached, <1ms), OPA sidecar (pull fresh, 0.5ms, complex ABAC). Engineering math: 10M DAU × 100 calls/day = 11,600 auth checks/second — must handle this without DB saturation. Google Zanzibar = relational tuple store for ACL, billions of checks/second, consistency tokens for freshness control. OPA as code = policies are git-versioned, CI-tested, deployed without redeploy.

*If you go blank*: "JWT for standard, Redis cache for moderate, OPA sidecar for complex. Authorization must be measured with P99 latency SLO. 10M users = 11K checks/sec — must cache aggressively."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
- At 10M DAU, uncached authorization queries can saturate the DB cluster — auth becomes the bottleneck, not business logic
- Policy-as-code (OPA) makes authorization testable, auditable, and change-manageable — the same DevOps discipline applied to security policy
- The difference between a 0.5ms and a 20ms auth check defines whether your API can handle 50K RPS vs 2.5K RPS — a 20x throughput difference

**How it works:**
Permissions are evaluated using a tiered strategy: simple checks use pre-decoded JWT claims in memory (no I/O), complex checks query a Redis cache (single network hop), and policy-based ABAC decisions go to an OPA sidecar (localhost socket, ~0.5ms). Policy bundles are pushed to OPA instances via a bundle server and reloaded without restart. Authorization latency is instrumented as a P99 metric with alerts at 2ms.

**Company-specific relevance:**
- **Microsoft**: Azure Policy at scale runs billions of compliance evaluations per day — implemented as a distributed policy engine across regions
- **Adobe**: Adobe Experience Platform's authorization scales to evaluate permissions for data governance policies across petabytes of data assets
- **Salesforce**: Salesforce's multi-tenant authorization engine evaluates OWD + role hierarchy + sharing rules for every record access — billions of evaluations per day
- **Cisco**: Cisco's networking APIs handle authorization for configurations across millions of devices — authorization must be available even during network partitions (fail-open vs fail-closed design)
