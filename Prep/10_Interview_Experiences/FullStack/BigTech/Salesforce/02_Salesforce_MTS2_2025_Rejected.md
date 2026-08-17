# Salesforce — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Salesforce |
| **Role** | MTS-2 (Member of Technical Staff) |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Hyderabad, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/salesforce-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + System Design + HM)
- **Rejection Reason:** System Design — couldn't explain multi-tenancy for CRM at scale

---

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Maximum Subarray Product** (LeetCode 152)
2. **Merge Overlapping Intervals with Labels**

### 💡 Maximum Product Subarray

```java
public int maxProduct(int[] nums) {
    int maxProd = nums[0];
    int currMax = nums[0];
    int currMin = nums[0]; // Track min because negative × negative = positive
    
    for (int i = 1; i < nums.length; i++) {
        if (nums[i] < 0) {
            // Swap: multiply negative by currMin (most negative) to get max positive
            int temp = currMax;
            currMax = currMin;
            currMin = temp;
        }
        
        currMax = Math.max(nums[i], currMax * nums[i]);
        currMin = Math.min(nums[i], currMin * nums[i]);
        maxProd = Math.max(maxProd, currMax);
    }
    
    return maxProd;
}
// Time: O(n), Space: O(1)
// Key insight: track both max and min because of negative numbers

// Merge Overlapping Intervals with Labels
// Input: [{start: 1, end: 5, label: "A"}, {start: 3, end: 7, label: "B"}, {start: 8, end: 10, label: "A"}]
// Output: [{start: 1, end: 7, labels: ["A", "B"]}, {start: 8, end: 10, labels: ["A"]}]
public List<MergedInterval> mergeWithLabels(List<Interval> intervals) {
    intervals.sort(Comparator.comparingInt(a -> a.start));
    
    List<MergedInterval> result = new ArrayList<>();
    MergedInterval current = new MergedInterval(intervals.get(0));
    
    for (int i = 1; i < intervals.size(); i++) {
        Interval next = intervals.get(i);
        
        if (next.start <= current.end) {
            // Overlapping — merge
            current.end = Math.max(current.end, next.end);
            if (!current.labels.contains(next.label)) {
                current.labels.add(next.label);
            }
        } else {
            result.add(current);
            current = new MergedInterval(next);
        }
    }
    
    result.add(current);
    return result;
}
```

---

## Round 2: Technical 1 (DSA)
**Duration:** 60 minutes

### Questions Asked
1. **Design an LRU Cache supporting batch operations**
2. **Binary Tree Right Side View** (LeetCode 199) + Follow-up: Left + Right + Top views

### 💡 Right Side View + All Views

```java
// Right Side View — BFS level order, take last element
public List<Integer> rightSideView(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    if (root == null) return result;
    
    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);
    
    while (!queue.isEmpty()) {
        int size = queue.size();
        for (int i = 0; i < size; i++) {
            TreeNode node = queue.poll();
            if (i == size - 1) result.add(node.val); // Rightmost at this level
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
    }
    
    return result;
}

// Top View — BFS with horizontal distance
public List<Integer> topView(TreeNode root) {
    if (root == null) return new ArrayList<>();
    
    TreeMap<Integer, Integer> columnMap = new TreeMap<>(); // HD → first node at that HD
    Queue<int[]> queue = new LinkedList<>(); // [node reference index, horizontal distance]
    // Using a TreeNode+int pair:
    Queue<Object[]> q = new LinkedList<>();
    q.offer(new Object[]{root, 0});
    
    while (!q.isEmpty()) {
        Object[] pair = q.poll();
        TreeNode node = (TreeNode) pair[0];
        int hd = (int) pair[1];
        
        // Only record FIRST node at each horizontal distance (top view)
        columnMap.putIfAbsent(hd, node.val);
        
        if (node.left != null) q.offer(new Object[]{node.left, hd - 1});
        if (node.right != null) q.offer(new Object[]{node.right, hd + 1});
    }
    
    return new ArrayList<>(columnMap.values());
}

// Bottom View — same as Top View but always overwrite (last BFS node wins)
// columnMap.put(hd, node.val) instead of putIfAbsent
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Salesforce CRM Multi-Tenant Architecture**
   - Object model (Accounts, Contacts, Opportunities, Custom Objects)
   - Multi-tenancy isolation, custom fields, workflow automation

### 💡 Interview-Ready Answer

```
Salesforce Multi-Tenant CRM:
┌──────────────────────────────────────────────────────────────┐
│  Multi-Tenancy Model (Salesforce's Real Architecture):       │
│                                                                │
│  Shared Database: ALL tenants share the same physical tables  │
│  - NO separate schemas per tenant                            │
│  - NO separate databases per tenant                          │
│  - Single table: DATA (tenant_id, object_type, Id,           │
│                       field1, field2, ..., field500)          │
│  - Each field column stores VARCHAR → type checking in app   │
│  - Why? 150K+ tenants — can't have separate schema per each  │
│                                                                │
│  Custom Object / Custom Field Architecture:                   │
│  ┌────────────────────────────────────────────────────┐      │
│  │ MT_DATA (Pivot Table):                              │      │
│  │ org_id | obj_type | record_id | value0 | ... | v500│      │
│  │                                                      │      │
│  │ MT_FIELDS (Metadata):                               │      │
│  │ org_id | obj_type | field_name | column_ref |       │      │
│  │ | field_type | required | indexed                    │      │
│  │                                                      │      │
│  │ Example:                                             │      │
│  │ Org "Acme" creates custom field "Revenue__c" on     │      │
│  │ Account → MT_FIELDS row: {org: Acme, obj: Account,  │      │
│  │ field: Revenue__c, column: value42, type: Currency}  │      │
│  │                                                      │      │
│  │ value42 stores "1500000.00" (VARCHAR, cast at read) │      │
│  └────────────────────────────────────────────────────┘      │
│                                                                │
│  Custom Indexing:                                              │
│  - MT_INDEX_* tables for custom-indexed fields               │
│  - When tenant indexes a custom field:                       │
│    Async job copies data from value42 to MT_INDEX_42         │
│  - Query planner checks tenant's indexed fields before query │
│                                                                │
│  Tenant Isolation:                                            │
│  - EVERY query has org_id in WHERE clause (enforced by app)  │
│  - Application-level isolation, NOT database-level           │
│  - Query optimizer: statistics per tenant (not global)       │
│  - Resource governor: per-tenant CPU/memory limits           │
│  - API rate limits: 15K calls per 24h per org (configurable) │
│                                                                │
│  Workflow / Automation:                                        │
│  - Triggers: before/after insert/update/delete               │
│  - Flow Builder: visual automation (if-then-else)            │
│  - Process Builder: record-triggered flows                   │
│  - Apex (custom code): runs in sandboxed multi-tenant VM     │
│    Governor limits: 100 SOQL queries, 150 DML, 6MB heap     │
│                                                                │
│  SOQL (Salesforce Object Query Language):                     │
│  - Not SQL — optimized for object model                      │
│  - SELECT Name, Account.Name FROM Contact WHERE CreatedDate > │ LAST_YEAR
│  - Translated internally to:                                  │
│    SELECT value5, value12 FROM MT_DATA                       │
│    WHERE org_id = :orgId AND obj_type = 'Contact'            │
│    AND value15 > :lastYear                                   │
│                                                                │
│  Scale:                                                       │
│  - 150K+ organizations (tenants)                             │
│  - Billions of records across all tenants                    │
│  - Sub-100ms query response for indexed SOQL                 │
│  - 4 release cycles/year (Summer '25, Winter '25...)         │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Salesforce = **multi-tenancy is THE system design topic**
- **Max Product Subarray** = track both max and min (negative numbers flip)
- **Tree views** (right, top, bottom, left) = BFS + horizontal distance — Salesforce classic
- **Salesforce multi-tenancy**: shared DB, pivot tables, VARCHAR for all fields, metadata-driven
- **Custom fields** = column mapping (value0-value500) + metadata table for field definitions
- **SOQL** → SQL translation: application translates custom field names to column references
- **Governor limits** = Salesforce's way of preventing one tenant from hogging resources
- I failed because I proposed "schema-per-tenant" → doesn't scale to 150K tenants

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Max Product Subarray, Merge Intervals |
| DSA | Medium-Hard | Tree Views, LRU Batch Operations |
| System Design | Very Hard | Multi-Tenancy, Metadata-Driven DB |
| HM | Medium | Behavioral |
