# 202 – Authorization Caching

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Authorization caching stores the results of permission evaluations so that repeated authorization checks for the same user don't require repeated database queries or policy evaluations. Without caching, every API request that checks "does user X have permission Y?" triggers a database read — at 10M daily active users, this becomes the bottleneck before the actual business logic. The key challenge is **cache invalidation**: when a user's role changes, all cached permission data for that user must be invalidated immediately, or access decisions will be stale. Cache keys must include the tenantId (multi-tenant isolation) and userId, and the TTL must balance freshness against performance.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### What to Cache at Each Layer

```
Browser (in-memory):
  - Decoded JWT claims (already available, no cache needed)
  - CASL Ability object (reconstruct from JWT on token refresh)
  - Feature flags (TTL: 5 min, invalidate on session events)

API Gateway / Edge:
  - Not appropriate — per-user permissions can't be cached at edge without
    user context

Backend Service:
  - Permission set for user: Redis SET with TTL 5 min
    Key: perm:${tenantId}:${userId}
    Value: JSON array of permissions
  - Role hierarchy resolution: short-lived in-process cache

Database:
  - Read replicas for permission queries (async replication)
  - Query caching (PostgreSQL shared_buffers)
```

### Redis Caching Pattern

```typescript
async function getUserPermissions(userId: string, tenantId: string): Promise<string[]> {
  const key = `perm:${tenantId}:${userId}`;

  // Try cache first
  const cached = await redis.get<string[]>(key);
  if (cached) return cached;

  // Cache miss — load from database
  const permissions = await permissionRepo.loadForUser(userId, tenantId);

  // Store with TTL
  await redis.setex(key, 300, JSON.stringify(permissions)); // 5 min TTL

  return permissions;
}
```

### Cache Invalidation Strategies

| Strategy | How | Tradeoff |
|---|---|---|
| TTL expiry | Short TTL (5 min) | Stale window = TTL; simple |
| Explicit invalidation | Delete key on role change | Immediate consistency; coupling |
| Event-driven | Publish role-change event → subscriber deletes | Decoupled; async latency |
| Version tagging | Permission version in JWT; cache keyed by version | Complex; no TTL + version |

### Event-Driven Invalidation

```typescript
// Role change event → pub/sub → cache invalidation
async function onRoleChanged(userId: string, tenantId: string): Promise<void> {
  await redis.del(`perm:${tenantId}:${userId}`);         // invalidate cache
  await redis.del(`ability:${tenantId}:${userId}`);      // invalidate CASL ability
  await tokenRevocationService.revokeAll(userId);         // force re-login
  await eventBus.publish('permissions.changed', { userId, tenantId });
}
```

### Frontend Permission Cache

```typescript
// Angular AuthService — in-memory permission cache with reactive invalidation
@Injectable({ providedIn: 'root' })
export class AuthService {
  private _permissions$ = new BehaviorSubject<Set<string>>(new Set());

  // Load at app bootstrap — not on every navigation
  async initialize(): Promise<void> {
    const token = this.tokenService.getAccessToken();
    const claims = this.jwt.decode(token);
    this._permissions$.next(new Set(claims.permissions));
  }

  // Synchronous check from in-memory cache
  hasPermission(permission: string): boolean {
    return this._permissions$.value.has(permission);
  }

  // Called when token refreshes
  refreshPermissions(newToken: string): void {
    const claims = this.jwt.decode(newToken);
    this._permissions$.next(new Set(claims.permissions));
  }
}
```

### Anti-Patterns

- ❌ No cache — every API call hits the permission DB (N+1 permission query problem)
- ❌ No TTL — stale permissions indefinitely (role change never reflected)
- ❌ Cache without tenantId in key — tenant A gets tenant B's permissions (data leak)
- ❌ Too-long TTL (>15 min) — permission changes take up to 15 min to take effect
- ❌ Caching in frontend localStorage — permissions can be modified in DevTools

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG-Scale: Google's Zanzibar

Google's Zanzibar (ACL storage system powering Google Drive, Calendar, etc.) uses a multi-layer cache: in-process cache → regional Spanner replicas → global Spanner. Permission checks (called "Check" calls) are cached with consistency tokens that guarantee the cache is never more than an acceptable window stale. Zanzibar processes billions of permission checks per second — this is only possible through aggressive multi-layer caching.

### FAANG-Scale: Salesforce

Salesforce caches user permission sets at the session level. When an admin changes a user's permission, Salesforce invalidates that user's session cache. For LWC, `@AuraEnabled(cacheable=true)` Apex methods are cached for the current user session — permission changes may not be visible until the session cache is cleared or the TTL expires (~3 seconds in force/5 minutes in lightning).

### Hruday @ SAP Labs — BTP Permission Cache

At SAP, we implemented a Redis-based permission cache keyed by `${tenantId}:${userId}`. Cache TTL was 5 minutes. When a user's XSUAA role was modified in the admin console, the admin service published a `permissions.changed` event to Apache Kafka. A cache invalidation consumer subscribed to this topic and immediately deleted the Redis key for that user. This gave us both performance (5-min cache hits) and near-real-time invalidation (<2 seconds after role change).

### Scaling:

At 100K concurrent users each making 10 API calls per minute, uncached permission queries = 1M DB calls/minute. Redis cache with 90% hit rate reduces this to 100K DB calls/minute — an order of magnitude improvement. The critical insight: cache the permission set, not the individual permission check result.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Authorization caching is about serving permission decisions from memory instead of re-querying the permission store on every API call. I implement a two-layer approach: backend Redis cache (TTL 5 minutes) for server-side permission lookups, and an in-memory permission set on the frontend loaded from the JWT at login.*

*The hard problem is cache invalidation. When a user's role changes, I use event-driven invalidation: the role change service publishes a `permissions.changed` event, and a cache invalidation subscriber immediately deletes the Redis key for that user. I also revoke the user's JWT so they get a fresh token with updated claims on next refresh.*

*Cache keys always include tenantId: `perm:${tenantId}:${userId}`. Without this, tenant isolation is broken — a cache miss might be populated with another tenant's permissions under a race condition. TTL is my safety net: even if event-driven invalidation fails, permissions are refreshed within 5 minutes."*

### Follow-up Questions

1. **"What's the right TTL for permission cache?"** — 2-5 minutes for role assignments. 15-60 seconds for financial/compliance-critical permissions. Balance freshness vs DB query savings.
2. **"How do you immediately revoke access on role removal?"** — Event-driven cache invalidation (delete Redis key) + force JWT refresh (revoke tokens). Zero-latency with this approach.
3. **"Why is hashing the permission set better than caching individual checks?"** — Caching the full permission set (`Set<string>`) means O(1) check in-memory. Individual check results require a cache entry per user×permission combination — exponential storage.
4. **"What's the risk of frontend permission caching?"** — JWT claims are the source of truth. Frontend must NEVER store permissions in localStorage (XSS-accessible). In-memory `BehaviorSubject` is safe — cleared on page unload.
5. **"How do you cache in a multi-instance backend?"** — Use shared Redis, not in-process memory. In-process cache is local to the instance — only works with sticky sessions (bad for horizontal scale).

### Comparison Table

| Cache Layer | Location | TTL | Invalidation | Multi-instance |
|---|---|---|---|---|
| JWT claims | Client memory | Token expiry | Token refresh | N/A |
| BehaviorSubject | Angular/React memory | Page session | Token refresh | N/A |
| Redis | Shared backend | 5 min | Event-driven | ✅ Shared |
| In-process Map | Server memory | Custom | Manual | ❌ Not shared |
| DB read replica | Database tier | Replication lag | Automatic | ✅ |

### Trade-offs

- Short TTL = more frequent DB reads; long TTL = stale permissions window
- Event-driven invalidation adds coupling between role service and cache service (mitigate with message broker)
- Redis as single point introduces latency when Redis is unavailable — fallback to DB direct with circuit breaker

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Backend — Redis permission cache service
@Injectable()
export class PermissionCacheService {
  private readonly TTL_SECONDS = 300; // 5 minutes
  private readonly PREFIX = 'perm';

  constructor(
    private readonly redis: RedisService,
    private readonly permissionRepo: PermissionRepository
  ) {}

  private cacheKey(tenantId: string, userId: string): string {
    return `${this.PREFIX}:${tenantId}:${userId}`;
  }

  async getPermissions(userId: string, tenantId: string): Promise<Set<string>> {
    const key = this.cacheKey(tenantId, userId);

    // Try cache
    const cached = await this.redis.get<string[]>(key);
    if (cached) return new Set(cached);

    // Cache miss — load from DB
    const permissions = await this.permissionRepo.loadEffectivePermissions(userId, tenantId);

    // Store in cache
    await this.redis.setex(key, this.TTL_SECONDS, JSON.stringify([...permissions]));
    return permissions;
  }

  // Called when role changes — immediate invalidation
  async invalidate(userId: string, tenantId: string): Promise<void> {
    await this.redis.del(this.cacheKey(tenantId, userId));
  }

  async has(userId: string, tenantId: string, permission: string): Promise<boolean> {
    const permissions = await this.getPermissions(userId, tenantId);
    return permissions.has(permission) || permissions.has('*');
  }
}

// Event-driven invalidation consumer
@EventsHandler(RoleChangedEvent)
export class RoleChangedHandler implements IEventHandler<RoleChangedEvent> {
  constructor(
    private readonly cache: PermissionCacheService,
    private readonly tokenService: TokenRevocationService
  ) {}

  async handle({ userId, tenantId }: RoleChangedEvent): Promise<void> {
    await Promise.all([
      this.cache.invalidate(userId, tenantId),     // clear Redis
      this.tokenService.revokeAll(userId),          // force re-login
    ]);
  }
}

// Angular — in-memory permission cache with reactive updates
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly permissions$ = new BehaviorSubject<Set<string>>(new Set());

  loadFromToken(accessToken: string): void {
    const { permissions } = this.jwtService.decode<JwtClaims>(accessToken);
    this.permissions$.next(new Set(permissions));
  }

  hasPermission(permission: string): boolean {
    const perms = this.permissions$.value;
    return perms.has(permission) || perms.has('*');
  }

  // Observable for reactive UI updates
  permissionChange$(permission: string): Observable<boolean> {
    return this.permissions$.pipe(
      map(perms => perms.has(permission)),
      distinctUntilChanged()
    );
  }
}
```

**Why this structure:**
- `cacheKey` with tenantId ensures tenant isolation in shared Redis
- `setex` sets TTL atomically with the value — no race condition between SET and EXPIRE
- Event-driven invalidation + token revocation = zero stale access after role change
- `BehaviorSubject` on frontend enables reactive re-render of permission-gated elements

**Interviewer focus:** Redis key naming with tenantId, event-driven invalidation pattern, TTL as safety net, BehaviorSubject for reactive UI

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Cache the set, not the check."** Store `Set<permission>` per user in Redis, not individual check results (that's exponential). Key format: `perm:tenantId:userId`. TTL = 5 min (safety net). Event-driven invalidation = role change → delete key → force token refresh → immediate consistency. Frontend: `BehaviorSubject<Set<string>>` loaded from JWT at login — synchronous checks, zero latency. Never localStorage for permissions. Never skip tenantId in cache key.

*If you go blank*: "Redis key: perm:tenantId:userId, TTL 5 min. Role change event deletes the key immediately. Frontend: BehaviorSubject from JWT, synchronous."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
- Without permission caching, every API call hits the permission DB — at 10M daily users this creates a DB bottleneck that throttles all business logic
- Google Zanzibar processes billions of permission checks per second purely through multi-layer caching — permission caching is a core infrastructure concern, not an optimization
- Stale permissions (long TTL without invalidation) is a security risk: a demoted admin retains access until the cache expires

**How it works:**
On first request, permission data is loaded from the database and stored in Redis with a 5-minute TTL. Subsequent requests for the same user resolve from Redis in <1ms. When a role changes, the role service publishes an event; the cache invalidation consumer deletes the Redis entry immediately and revokes tokens. On the frontend, JWT claims populate a `BehaviorSubject<Set<string>>` at login — permission checks are synchronous O(1) hash lookups.

**Company-specific relevance:**
- **Microsoft**: Azure AD token claims cache permissions at the token level — this IS the permission cache for M365 services; short token expiry + refresh rotation is the invalidation mechanism
- **Adobe**: Creative Cloud permission cache determines feature enablement across 5+ product surfaces — stale permissions directly impact user experience and subscription enforcement
- **Salesforce**: Session-level permission cache in Salesforce means admin-side permission changes require either cache TTL expiry or explicit session invalidation to take effect in LWC
- **Cisco**: Network management APIs cache device permission checks — a misconfigured cache could allow a read-only user to send device commands during the stale window
