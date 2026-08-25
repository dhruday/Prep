# Adobe — SDE-3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Adobe |
| **Role** | Senior Computer Scientist |
| **Level** | SDE-3 |
| **YOE** | 8 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/adobe-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Adobe Experience Platform |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + OA + 2 Technical + HM)

---

## Round 3: DSA — Implement a Segment Tree with Lazy Propagation
**Duration:** 50 minutes

### Question: Given an array of integers, support range sum queries and range update (add value to all elements in a range) efficiently. 

```java
/**
 * Segment Tree with Lazy Propagation:
 * 
 * Supports:
 * - rangeUpdate(l, r, val): add val to all elements in [l, r]
 * - rangeQuery(l, r): sum of elements in [l, r]
 * 
 * Both operations in O(log N) with lazy propagation.
 * 
 * Lazy propagation defers updates to child nodes until they're needed,
 * avoiding O(N) updates per range modification.
 */
class SegmentTree {
    private long[] tree;  // segment tree nodes (sum values)
    private long[] lazy;  // pending lazy values
    private int n;
    
    public SegmentTree(int[] arr) {
        this.n = arr.length;
        tree = new long[4 * n];
        lazy = new long[4 * n];
        build(arr, 1, 0, n - 1);
    }
    
    /**
     * Build tree: O(N)
     * tree[node] = sum of arr[start..end]
     */
    private void build(int[] arr, int node, int start, int end) {
        if (start == end) {
            tree[node] = arr[start];
            return;
        }
        int mid = (start + end) / 2;
        build(arr, 2 * node, start, mid);
        build(arr, 2 * node + 1, mid + 1, end);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }
    
    /**
     * Push lazy value down to children.
     * Key insight: parent's lazy value means "all elements in my range 
     * have a pending +lazy addition".
     * 
     * When pushing:
     * - Each child's node sum increases by lazy * (child's range size)
     * - Each child inherits the lazy value (additive)
     * - Parent's lazy is cleared
     */
    private void pushDown(int node, int start, int end) {
        if (lazy[node] != 0) {
            int mid = (start + end) / 2;
            
            // Left child: [start, mid]
            tree[2 * node] += lazy[node] * (mid - start + 1);
            lazy[2 * node] += lazy[node];
            
            // Right child: [mid+1, end]
            tree[2 * node + 1] += lazy[node] * (end - mid);
            lazy[2 * node + 1] += lazy[node];
            
            lazy[node] = 0;
        }
    }
    
    /**
     * Range Update: add val to all elements in [l, r]
     * O(log N) with lazy propagation.
     * 
     * Three cases:
     * 1. No overlap: return
     * 2. Complete overlap: update node sum, set lazy, return
     * 3. Partial overlap: push down, recurse on children, merge
     */
    public void rangeUpdate(int l, int r, long val) {
        update(1, 0, n - 1, l, r, val);
    }
    
    private void update(int node, int start, int end, int l, int r, long val) {
        // No overlap
        if (r < start || end < l) return;
        
        // Complete overlap
        if (l <= start && end <= r) {
            tree[node] += val * (end - start + 1);
            lazy[node] += val;
            return;
        }
        
        // Partial overlap: push down and recurse
        pushDown(node, start, end);
        
        int mid = (start + end) / 2;
        update(2 * node, start, mid, l, r, val);
        update(2 * node + 1, mid + 1, end, l, r, val);
        
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }
    
    /**
     * Range Query: sum of elements in [l, r]
     * O(log N)
     */
    public long rangeQuery(int l, int r) {
        return query(1, 0, n - 1, l, r);
    }
    
    private long query(int node, int start, int end, int l, int r) {
        // No overlap
        if (r < start || end < l) return 0;
        
        // Complete overlap
        if (l <= start && end <= r) return tree[node];
        
        // Partial overlap: push down and recurse
        pushDown(node, start, end);
        
        int mid = (start + end) / 2;
        long leftSum = query(2 * node, start, mid, l, r);
        long rightSum = query(2 * node + 1, mid + 1, end, l, r);
        
        return leftSum + rightSum;
    }
    
    /**
     * Point query: get single element value.
     */
    public long pointQuery(int index) {
        return rangeQuery(index, index);
    }
}
```

---

## Round 4: System Design — Adobe Experience Platform (Real-Time Customer Profile)
**Duration:** 60 minutes

### Architecture:
```
┌──────────────────────────────────────────────────────────────────┐
│         Adobe Experience Platform — Real-Time CDP                │
│                                                                  │
│  Data Ingestion:                                                 │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ Sources:                                                   │   │
│  │  - Web SDK (page views, clicks) → 100K events/sec         │   │
│  │  - CRM batch import (Salesforce, SAP)                      │   │
│  │  - Mobile SDK events                                       │   │
│  │  - Email engagement (opens, clicks)                        │   │
│  │  - POS / offline transactions                              │   │
│  │                                                            │   │
│  │ Ingestion Pipeline:                                        │   │
│  │  Events → Kafka → Schema Validation (XDM) → Profile Store  │   │
│  │  Batch  → Azure Data Lake → ETL → Profile Store             │   │
│  │                                                            │   │
│  │ XDM (Experience Data Model):                               │   │
│  │  - Standardized schema for all data                        │   │
│  │  - ExperienceEvent: timestamped actions                    │   │
│  │  - Individual Profile: merged entity                       │   │
│  └───────────────────────────────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────▼──────────────────────────────────┐   │
│  │ Identity Resolution (Identity Graph):                      │   │
│  │                                                            │   │
│  │ Problem: Same person has multiple identifiers              │   │
│  │  - Email: john@example.com                                │   │
│  │  - Cookie: abc123                                          │   │
│  │  - Login ID: john_doe                                      │   │
│  │  - Device ID: device_xyz                                   │   │
│  │                                                            │   │
│  │ Solution: Union-Find (Disjoint Set) graph:                 │   │
│  │  - Each identity is a node                                 │   │
│  │  - Login event links email + cookie → union()              │   │
│  │  - find(email) == find(cookie) → same person              │   │
│  │                                                            │   │
│  │ Challenge: "Identity Collapse"                             │   │
│  │  - Shared device: two people → one profile (BAD)          │   │
│  │  - Solution: confidence scoring + graph stitching rules    │   │
│  │  - High confidence: email, login, CRM ID                  │   │
│  │  - Low confidence: cookie, IP address                      │   │
│  │  - Rule: max 5 low-confidence links per profile            │   │
│  │                                                            │   │
│  │ Storage: Neo4j / JanusGraph for identity graph             │   │
│  │ Latency: < 50ms for identity lookup                        │   │
│  └───────────────────────────────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────▼──────────────────────────────────┐   │
│  │ Unified Profile Store:                                     │   │
│  │                                                            │   │
│  │ Per profile:                                               │   │
│  │  - Merge policy: last-writer-wins per field                │   │
│  │  - Attributes: name, email, preferences, segments          │   │
│  │  - Events timeline: last 14 days of raw events             │   │
│  │  - Computed attributes: "total spend last 30 days"         │   │
│  │                                                            │   │
│  │ Storage:                                                   │   │
│  │  - HBase / Cassandra: profile attributes (wide column)     │   │
│  │  - Event store: time-series (Kafka persistent) 14d TTL     │   │
│  │  - Cache: Redis for hot profiles (top 10%)                 │   │
│  │                                                            │   │
│  │ Scale:                                                     │   │
│  │  - 100M+ profiles, 50B+ events/day                        │   │
│  │  - Profile lookup: < 50ms (Redis hit), < 200ms (HBase)    │   │
│  └───────────────────────────────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────▼──────────────────────────────────┐   │
│  │ Segment Evaluation Engine:                                 │   │
│  │                                                            │   │
│  │ Batch segmentation:                                        │   │
│  │  - Daily Spark job evaluates all profiles against segments │   │
│  │  - "Users who spent > $500 AND visited checkout page"      │   │
│  │                                                            │   │
│  │ Streaming segmentation (real-time):                        │   │
│  │  - Event arrives → evaluate segment rules immediately      │   │
│  │  - Uses Flink / custom CEP (Complex Event Processing)      │   │
│  │  - "User viewed product 3+ times in 1 hour" → trigger     │   │
│  │                                                            │   │
│  │ Edge segmentation:                                          │   │
│  │  - Evaluate on CDN edge for < 10ms personalization         │   │
│  │  - Pre-computed segment memberships pushed to edge          │   │
│  └───────────────────────────────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────▼──────────────────────────────────┐   │
│  │ Activation:                                                │   │
│  │  - Real-time: profile change → webhook to Target/Journey   │   │
│  │  - Batch: nightly segment export to email/ad platforms      │   │
│  │  - Edge: personalized content served from CDN               │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Adobe SDE-3 = **Segment Tree with Lazy Propagation + Real-Time CDP System Design**
- **Segment Tree**: `tree[node] = sum(arr[start..end])`, children at `2*node`, `2*node+1`
- **Lazy propagation**: defer child updates — `pushDown()` only when needed — both update() and query() call pushDown
- **Complete/Partial/No overlap**: three cases pattern used in both query and update
- **Identity Resolution**: Union-Find to merge identifiers → single profile — **identity collapse** mitigation via confidence scoring
- **XDM schema**: standardized data model — ExperienceEvent + Individual Profile
- **Streaming segmentation**: Flink CEP for real-time segment membership evaluation
- **Edge segmentation**: pre-computed memberships at CDN edge — <10ms personalization
- Adobe = **MarTech + Creative Cloud** — expect data pipeline, identity resolution, real-time personalization questions

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | DSA |
| OA | Medium | Coding |
| DSA | Very Hard | Segment Tree, Lazy Propagation |
| System Design | Very Hard | Real-Time CDP, Identity Graph |
| HM | Medium | Culture Fit |
