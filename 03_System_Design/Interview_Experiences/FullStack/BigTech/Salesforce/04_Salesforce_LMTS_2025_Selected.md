# Salesforce — SDE-3 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Salesforce |
| **Role** | Lead Member Technical Staff |
| **Level** | LMTS (SDE-3 equivalent) |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [Glassdoor](https://www.glassdoor.com/Interview/Salesforce-Interview-Questions-E11159.htm) |
| **Author** | Anonymous |
| **Team** | Salesforce Platform |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + System Design + HM)

---

## Round 1: DSA
**Duration:** 60 minutes

### Question 1: Implement a Multi-Tenant Query Executor with Resource Isolation

```java
import java.util.*;
import java.util.concurrent.*;

/**
 * Multi-tenant Query Executor:
 * - Each tenant gets a resource quota (CPU time, memory, query count)
 * - Fair scheduling: no tenant can starve others
 * - Priority: paid tier > free tier
 * - Circuit breaker: if a tenant's queries keep failing, pause execution
 * 
 * Uses weighted fair queuing + token bucket per tenant.
 */
public class MultiTenantQueryExecutor {
    
    enum TenantTier { FREE, BASIC, ENTERPRISE }
    
    static class TenantConfig {
        String tenantId;
        TenantTier tier;
        int maxConcurrentQueries;
        int maxQueriesPerMinute;
        long maxQueryTimeMs;
        
        TenantConfig(String tenantId, TenantTier tier) {
            this.tenantId = tenantId;
            this.tier = tier;
            
            switch (tier) {
                case FREE:
                    this.maxConcurrentQueries = 2;
                    this.maxQueriesPerMinute = 60;
                    this.maxQueryTimeMs = 10_000;
                    break;
                case BASIC:
                    this.maxConcurrentQueries = 10;
                    this.maxQueriesPerMinute = 300;
                    this.maxQueryTimeMs = 30_000;
                    break;
                case ENTERPRISE:
                    this.maxConcurrentQueries = 50;
                    this.maxQueriesPerMinute = 1000;
                    this.maxQueryTimeMs = 120_000;
                    break;
            }
        }
    }
    
    static class TenantState {
        TenantConfig config;
        Semaphore concurrencyLimiter;
        // Sliding window rate limiter
        Queue<Long> requestTimestamps = new ConcurrentLinkedQueue<>();
        // Circuit breaker
        int consecutiveFailures = 0;
        long circuitOpenUntil = 0;
        
        TenantState(TenantConfig config) {
            this.config = config;
            this.concurrencyLimiter = new Semaphore(config.maxConcurrentQueries);
        }
        
        boolean isCircuitOpen() {
            return System.currentTimeMillis() < circuitOpenUntil;
        }
        
        boolean tryAcquireRate() {
            long now = System.currentTimeMillis();
            long windowStart = now - 60_000; // 1-minute window
            
            // Remove expired timestamps
            while (!requestTimestamps.isEmpty() && requestTimestamps.peek() < windowStart) {
                requestTimestamps.poll();
            }
            
            if (requestTimestamps.size() >= config.maxQueriesPerMinute) {
                return false; // Rate limit exceeded
            }
            
            requestTimestamps.add(now);
            return true;
        }
        
        void recordSuccess() {
            consecutiveFailures = 0;
        }
        
        void recordFailure() {
            consecutiveFailures++;
            if (consecutiveFailures >= 5) {
                // Open circuit for 30 seconds
                circuitOpenUntil = System.currentTimeMillis() + 30_000;
                consecutiveFailures = 0;
            }
        }
    }
    
    static class QueryResult {
        boolean success;
        Object data;
        String error;
        long executionTimeMs;
        
        QueryResult(boolean success, Object data, String error, long executionTimeMs) {
            this.success = success;
            this.data = data;
            this.error = error;
            this.executionTimeMs = executionTimeMs;
        }
    }
    
    private final Map<String, TenantState> tenants = new ConcurrentHashMap<>();
    private final ExecutorService executorPool;
    
    public MultiTenantQueryExecutor(int poolSize) {
        this.executorPool = Executors.newFixedThreadPool(poolSize);
    }
    
    public void registerTenant(TenantConfig config) {
        tenants.put(config.tenantId, new TenantState(config));
    }
    
    public CompletableFuture<QueryResult> executeQuery(String tenantId, Callable<Object> query) {
        TenantState state = tenants.get(tenantId);
        if (state == null) {
            return CompletableFuture.completedFuture(
                new QueryResult(false, null, "Unknown tenant", 0));
        }
        
        // Circuit breaker check
        if (state.isCircuitOpen()) {
            return CompletableFuture.completedFuture(
                new QueryResult(false, null, "Circuit open — queries paused after failures", 0));
        }
        
        // Rate limit check
        if (!state.tryAcquireRate()) {
            return CompletableFuture.completedFuture(
                new QueryResult(false, null, "Rate limit exceeded: " + 
                    state.config.maxQueriesPerMinute + " queries/min", 0));
        }
        
        return CompletableFuture.supplyAsync(() -> {
            long start = System.currentTimeMillis();
            
            try {
                // Concurrency limit
                if (!state.concurrencyLimiter.tryAcquire(5, TimeUnit.SECONDS)) {
                    return new QueryResult(false, null, "Concurrency limit reached", 0);
                }
                
                try {
                    // Execute with timeout
                    Future<Object> future = executorPool.submit(query);
                    Object result = future.get(state.config.maxQueryTimeMs, TimeUnit.MILLISECONDS);
                    
                    long elapsed = System.currentTimeMillis() - start;
                    state.recordSuccess();
                    return new QueryResult(true, result, null, elapsed);
                    
                } catch (TimeoutException e) {
                    long elapsed = System.currentTimeMillis() - start;
                    state.recordFailure();
                    return new QueryResult(false, null, "Query timeout: " + 
                        state.config.maxQueryTimeMs + "ms", elapsed);
                } catch (ExecutionException e) {
                    long elapsed = System.currentTimeMillis() - start;
                    state.recordFailure();
                    return new QueryResult(false, null, "Query failed: " + e.getCause().getMessage(), elapsed);
                } finally {
                    state.concurrencyLimiter.release();
                }
                
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return new QueryResult(false, null, "Interrupted", 0);
            }
        });
    }
}
```

---

## Round 2: System Design — Multi-Tenant CRM Data Pipeline

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│          Salesforce Multi-Tenant Data Pipeline                  │
│                                                                 │
│  Tenant Isolation Spectrum:                                     │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Shared Everything  ←──────→  Shared Nothing      │           │
│  │ (single DB, tenant_id col)   (dedicated DB/infra) │          │
│  │                                                   │           │
│  │ Salesforce uses: Shared schema + metadata-driven  │           │
│  │ All tenants share tables, isolated by org_id      │           │
│  │ Custom fields stored as flex columns (Value0..V500)│          │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Data Model (Metadata-Driven):                     │           │
│  │                                                   │           │
│  │ core_objects:                                     │           │
│  │ | org_id | object_type | field_metadata (JSON) |  │           │
│  │ | T001   | Account     | {Name:Str, Industry:Str} │          │
│  │                                                   │           │
│  │ data_rows:                                        │           │
│  │ | org_id | object_type | id | Value0 | Value1 |.. │          │
│  │ | T001   | Account     | A1 | Acme   | Tech   |  │           │
│  │                                                   │           │
│  │ Advantage: one table serves all custom objects    │           │
│  │ Disadvantage: no foreign keys, complex queries    │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Query Engine:                                     │           │
│  │                                                   │           │
│  │ SOQL → SQL translation:                           │           │
│  │ SELECT Name FROM Account WHERE Industry = 'Tech'  │           │
│  │ →                                                  │           │
│  │ SELECT Value0 FROM data_rows                       │           │
│  │ WHERE org_id = 'T001'                              │           │
│  │   AND object_type = 'Account'                      │           │
│  │   AND Value1 = 'Tech'                              │           │
│  │                                                   │           │
│  │ Indexes: per-tenant custom indexes on flex columns │           │
│  │ Query governor: max 100 SOQL queries per txn       │           │
│  │ Row limit: 50,000 rows per query                   │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  Resource Isolation:                                            │
│  - CPU: per-tenant thread pool + fair scheduler                │
│  - Memory: per-tenant heap limit + circuit breaker             │
│  - Storage: per-tenant quota + data archival policies          │
│  - API: per-tenant rate limits (by tier: free < enterprise)    │
│                                                                 │
│  Scale: 150K+ orgs, 50B+ records, 1M+ API calls/second       │
│  Noisy neighbor mitigation: usage metering + auto-throttle    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Salesforce LMTS = **Multi-tenant query executor + CRM data pipeline design**
- **Resource isolation**: Semaphore for concurrency + sliding window for rate + circuit breaker for failures
- **Circuit breaker**: 5 consecutive failures → pause 30s → half-open retry — prevents cascading failures
- **Metadata-driven schema**: flex columns (Value0..Value500) — one table serves all custom objects for all tenants
- **SOQL→SQL translation**: map field names to flex column positions using metadata — per-tenant field mapping
- **Governor limits**: max queries per transaction, max rows per query — prevent resource abuse
- **Noisy neighbor**: per-tenant metering + auto-throttle — degrade one tenant, not all
- Salesforce = **multi-tenancy expertise essential** — understand shared-schema patterns, governor limits, isolation

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| DSA | Hard | Multi-Tenant Executor, Concurrency |
| System Design | Very Hard | Multi-Tenant CRM, Metadata-Driven Schema |
| Technical 2 | Hard | Java, Database Internals |
| HM | Medium | Culture Fit |
