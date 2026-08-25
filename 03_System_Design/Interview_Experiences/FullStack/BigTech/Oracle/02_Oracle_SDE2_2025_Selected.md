# Oracle — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Oracle |
| **Role** | Applications Engineer III |
| **Level** | IC3 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/oracle-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Written Test + Technical 1 + Technical 2 + HM)
- **Timeline:** 2 weeks

---

## Round 1: Written Test
**Duration:** 120 minutes (3 questions)

### Questions Asked
1. **Maximum Length of Repeated Subarray** (LeetCode 718) — DP
2. **SQL: Find employees earning more than their managers** (self-join + complex subquery)
3. **Implement a simple database B+ Tree index** (conceptual + code)

### 💡 Maximum Length of Repeated Subarray

```java
public int findLength(int[] nums1, int[] nums2) {
    int m = nums1.length, n = nums2.length;
    
    // DP: dp[i][j] = length of longest common subarray ending at nums1[i-1] and nums2[j-1]
    int[][] dp = new int[m + 1][n + 1];
    int maxLen = 0;
    
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (nums1[i-1] == nums2[j-1]) {
                dp[i][j] = dp[i-1][j-1] + 1;
                maxLen = Math.max(maxLen, dp[i][j]);
            }
            // else dp[i][j] = 0 (default)
        }
    }
    
    return maxLen;
}
// Time: O(m*n), Space: O(m*n)
// Optimized: O(n) space with rolling array (only need previous row)

// Space-optimized:
public int findLengthOptimized(int[] nums1, int[] nums2) {
    int m = nums1.length, n = nums2.length;
    int[] dp = new int[n + 1];
    int maxLen = 0;
    
    for (int i = 1; i <= m; i++) {
        // Traverse right to left to avoid using updated values
        for (int j = n; j >= 1; j--) {
            if (nums1[i-1] == nums2[j-1]) {
                dp[j] = dp[j-1] + 1;
                maxLen = Math.max(maxLen, dp[j]);
            } else {
                dp[j] = 0;
            }
        }
    }
    return maxLen;
}
```

### 💡 SQL: Employees earning more than managers

```sql
-- Standard approach
SELECT e.name AS Employee
FROM employees e
JOIN employees m ON e.manager_id = m.employee_id
WHERE e.salary > m.salary;

-- Complex variant: employees earning more than the average of their department's managers
SELECT e.name, e.salary, e.department_id
FROM employees e
WHERE e.salary > (
    SELECT AVG(m.salary)
    FROM employees m
    WHERE m.employee_id IN (
        SELECT DISTINCT manager_id FROM employees WHERE department_id = e.department_id
    )
);

-- Window function variant: rank employees by salary within department
-- Find those whose rank is higher than their manager's rank
WITH ranked AS (
    SELECT 
        employee_id, name, salary, manager_id, department_id,
        DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) as sal_rank
    FROM employees
)
SELECT r1.name, r1.salary, r1.sal_rank, r2.salary as mgr_salary, r2.sal_rank as mgr_rank
FROM ranked r1
JOIN ranked r2 ON r1.manager_id = r2.employee_id
WHERE r1.sal_rank < r2.sal_rank; -- Higher rank (lower number) = higher salary
```

---

## Round 2: Technical 1 (Java Deep Dive)
**Duration:** 60 minutes

### Questions Asked
1. **Explain JVM Garbage Collection — G1GC vs ZGC**
2. **Implement a Connection Pool with configurable parameters**
3. **What happens when you call `new String("hello")` vs `"hello"` in Java?**

### 💡 G1GC vs ZGC (Interview-Ready)

```
G1GC (Garbage First):
- Default GC in Java 11+
- Heap divided into regions (~2048 regions, each 1-32 MB)
- Young Gen: Eden + Survivor regions (dynamic allocation)
- Old Gen: remaining regions
- Mixed collection: collect young + some old gen regions
- Pause target: -XX:MaxGCPauseMillis=200 (default 200ms)
- Best for: heap size 4-16 GB, latency-sensitive apps

ZGC (Z Garbage Collector):
- Introduced Java 11, production-ready Java 15+
- Concurrent GC: almost all work done concurrently with app threads
- Colored pointers: uses pointer bits to track GC state
- Load barriers: intercept pointer loads, fix references if needed
- Pause time: < 1ms regardless of heap size (even 16TB heaps!)
- Best for: very large heaps (16GB+), ultra-low-latency requirements

When to use which:
- Web app with 8GB heap, 99th p latency < 100ms → G1GC
- Trading system, 64GB heap, p99 < 5ms → ZGC
- Batch processing, throughput matters → ParallelGC
```

### 💡 String Pool

```java
// "hello" → stored in String Pool (part of heap since Java 7)
String s1 = "hello";      // Checks pool first → creates in pool if not exists
String s2 = "hello";      // Returns same reference from pool
s1 == s2;                  // true — same reference

// new String("hello") → creates object on HEAP (not pool)
String s3 = new String("hello"); // Creates new object + "hello" literal in pool
s1 == s3;                        // false — different references
s1.equals(s3);                   // true — same content

// How many objects? new String("hello") creates:
// 1. "hello" literal in String Pool (if not already there)
// 2. New String object on heap (copy of the pooled string)
// Answer: 1 or 2 objects, depending on whether "hello" was already in pool

// intern()
String s4 = s3.intern();  // Returns pooled reference
s1 == s4;                  // true — s4 points to pool
```

---

## Round 3: Technical 2 (System Design / DB)
**Duration:** 60 minutes

### Questions Asked
1. **Design a Multi-Tenant SaaS Database Architecture**
   - How to isolate tenants, handle schema changes, scale

### 💡 Interview-Ready Answer

```
Multi-Tenant Database Strategies:
┌──────────────────────────────────────────────────────────────┐
│  Strategy 1: Shared DB, Shared Schema (Most Common)          │
│  ┌─────────────────────────────┐                             │
│  │ Single Database              │                             │
│  │ orders: (tenant_id, id, ...) │                             │
│  │ users: (tenant_id, id, ...)  │                             │
│  └─────────────────────────────┘                             │
│  ✅ Simple, cost-efficient, easy migrations                   │
│  ❌ Noisy neighbor, security risk, tenant_id in EVERY query  │
│  Use: Small SaaS, <1000 tenants, similar workloads          │
│                                                                │
│  Row-Level Security (PostgreSQL):                             │
│  CREATE POLICY tenant_isolation ON orders                    │
│    USING (tenant_id = current_setting('app.tenant_id'));     │
│  → Every query automatically filtered by tenant_id          │
│  → Cannot accidentally access another tenant's data          │
│                                                                │
│  Strategy 2: Shared DB, Separate Schemas                     │
│  ┌─────────────────────────────┐                             │
│  │ Database                     │                             │
│  │ ├── schema_tenant_1          │                             │
│  │ │   ├── orders               │                             │
│  │ │   └── users                │                             │
│  │ ├── schema_tenant_2          │                             │
│  │ │   ├── orders               │                             │
│  │ │   └── users                │                             │
│  └─────────────────────────────┘                             │
│  ✅ Better isolation, per-tenant schema customization        │
│  ❌ Schema migration = N migrations (one per tenant)         │
│  Use: Mid-size SaaS, tenants need custom fields              │
│                                                                │
│  Strategy 3: Separate Databases per Tenant                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ tenant_1  │ │ tenant_2  │ │ tenant_3  │                    │
│  │ DB        │ │ DB        │ │ DB        │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
│  ✅ Complete isolation, per-tenant backup/restore            │
│  ❌ Expensive (1 DB per tenant), complex routing             │
│  Use: Enterprise SaaS, compliance requirements, large tenants│
│                                                                │
│  Oracle-Specific (Pluggable Databases):                       │
│  - Oracle 12c+ CDB/PDB architecture                         │
│  - Each tenant gets a PDB (Pluggable Database)               │
│  - Shared memory (SGA) but isolated data                     │
│  - Easy clone, move, provision new tenants                   │
│  - Best of both worlds: isolation + resource sharing         │
│                                                                │
│  Connection Routing:                                          │
│  1. Request arrives → extract tenant from: subdomain, header,│
│     or JWT claim                                             │
│  2. TenantContext ThreadLocal → set for request lifetime     │
│  3. DataSource router: select correct connection pool        │
│  4. All queries automatically scoped to tenant               │
│                                                                │
│  Schema Migration Strategy:                                   │
│  - Flyway/Liquibase with tenant-aware execution              │
│  - Rolling migration: migrate 10% → verify → continue       │
│  - Backward-compatible only (additive changes)               │
│  - Never drop columns immediately → deprecate → remove later │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Oracle = **strong Java + SQL + database internals** — know JVM, GC, String Pool deeply
- **Repeated Subarray** = DP (not LCS — subarray is contiguous), optimize with rolling array
- **G1GC vs ZGC** = always asked at Oracle — know pause times, heap sizes, use cases
- **String Pool** internals — `new String("hello")` creates 1-2 objects, explain clearly
- **Multi-tenant DB** is Oracle's bread and butter — mention Pluggable Databases (CDB/PDB)
- **Row-Level Security** (PostgreSQL) for shared-schema isolation — elegant solution
- Oracle interviews are **heavy on DB and Java internals** — less on DSA than FAANG

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Written Test | Medium-Hard | DP, Complex SQL, B+ Tree |
| Technical 1 | Hard | JVM GC, Connection Pool, String Pool |
| Technical 2 | Hard | Multi-Tenant DB, RLS, Schema Migration |
| HM | Medium | Behavioral |
