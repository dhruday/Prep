# Salesforce — SDE-2 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Salesforce |
| **Role** | LMTS (Lead Member of Technical Staff) |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Rejection Reason** | System design — didn't address multi-tenant data isolation properly |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + System Design + HM)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **LFU Cache** (LeetCode 460) — O(1) for all operations
2. **Follow-up: How would you implement LFU with TTL?**

### 💡 LFU Cache O(1) Implementation

```java
class LFUCache {
    private final int capacity;
    private int minFreq = 0;
    
    // key → Node
    private final Map<Integer, Node> keyMap = new HashMap<>();
    // freq → doubly-linked list (ordered by recency, head = most recent)
    private final Map<Integer, DoublyLinkedList> freqMap = new HashMap<>();
    
    static class Node {
        int key, value, freq;
        Node prev, next;
        Node(int key, int value) { this.key = key; this.value = value; this.freq = 1; }
    }
    
    static class DoublyLinkedList {
        Node head, tail; // head = most recent, tail = least recent
        int size;
        
        DoublyLinkedList() {
            head = new Node(0, 0);
            tail = new Node(0, 0);
            head.next = tail;
            tail.prev = head;
        }
        
        void addFirst(Node node) {
            node.next = head.next;
            node.prev = head;
            head.next.prev = node;
            head.next = node;
            size++;
        }
        
        void remove(Node node) {
            node.prev.next = node.next;
            node.next.prev = node.prev;
            size--;
        }
        
        Node removeLast() {
            if (size == 0) return null;
            Node last = tail.prev;
            remove(last);
            return last;
        }
        
        boolean isEmpty() { return size == 0; }
    }
    
    LFUCache(int capacity) { this.capacity = capacity; }
    
    int get(int key) {
        Node node = keyMap.get(key);
        if (node == null) return -1;
        
        updateFrequency(node);
        return node.value;
    }
    
    void put(int key, int value) {
        if (capacity == 0) return;
        
        if (keyMap.containsKey(key)) {
            Node node = keyMap.get(key);
            node.value = value;
            updateFrequency(node);
            return;
        }
        
        // Evict LFU (least frequency, then LRU among same frequency)
        if (keyMap.size() >= capacity) {
            DoublyLinkedList minFreqList = freqMap.get(minFreq);
            Node evicted = minFreqList.removeLast(); // LRU among min frequency
            keyMap.remove(evicted.key);
        }
        
        // Add new node
        Node newNode = new Node(key, value);
        keyMap.put(key, newNode);
        freqMap.computeIfAbsent(1, k -> new DoublyLinkedList()).addFirst(newNode);
        minFreq = 1; // New node always has freq 1
    }
    
    private void updateFrequency(Node node) {
        int oldFreq = node.freq;
        DoublyLinkedList oldList = freqMap.get(oldFreq);
        oldList.remove(node);
        
        // If this was the min frequency list and it's now empty, increment minFreq
        if (oldFreq == minFreq && oldList.isEmpty()) {
            minFreq++;
        }
        
        node.freq++;
        freqMap.computeIfAbsent(node.freq, k -> new DoublyLinkedList()).addFirst(node);
    }
}
// Time: O(1) for get and put
// Space: O(capacity)
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Salesforce's Multi-Tenant CRM Data Platform**
   - Multi-tenancy: thousands of orgs sharing infrastructure
   - Custom objects: tenants define their own data models
   - SOQL query engine: SQL-like queries on custom objects
   - Governor limits: enforce resource quotas per tenant
   - Data isolation: org A cannot see org B's data

### 💡 Key Design

```
Multi-Tenant Data Model (Salesforce's Pivot Table approach):
Instead of creating a physical table per custom object:

-- Universal table that stores ALL custom object data
CREATE TABLE mt_data (
    org_id UUID NOT NULL,
    object_type VARCHAR(80) NOT NULL,  -- "Account", "CustomWidget__c"
    record_id UUID NOT NULL,
    
    -- Pivot columns (generic typed columns)
    val_text_01 TEXT, val_text_02 TEXT, ..., val_text_50 TEXT,
    val_num_01 NUMERIC, val_num_02 NUMERIC, ..., val_num_20 NUMERIC,
    val_date_01 DATE, val_date_02 DATE, ..., val_date_10 DATE,
    val_bool_01 BOOLEAN, ..., val_bool_10 BOOLEAN,
    
    created_at TIMESTAMP, updated_at TIMESTAMP, created_by UUID,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    PRIMARY KEY (org_id, object_type, record_id)
);

-- Metadata: which pivot column maps to which custom field
CREATE TABLE mt_field_definitions (
    org_id UUID NOT NULL,
    object_type VARCHAR(80),
    field_name VARCHAR(80),    -- "Revenue__c"
    field_type VARCHAR(20),     -- "currency", "text", "date"
    pivot_column VARCHAR(20),   -- "val_num_03"
    is_required BOOLEAN,
    is_indexed BOOLEAN,
    is_unique BOOLEAN,
    PRIMARY KEY (org_id, object_type, field_name)
);

-- Custom indexes per tenant (only for indexed fields)
CREATE TABLE mt_index (
    org_id UUID,
    object_type VARCHAR(80),
    pivot_column VARCHAR(20),
    record_id UUID,
    indexed_value TEXT,
    PRIMARY KEY (org_id, object_type, pivot_column, indexed_value)
);

SOQL → SQL Translation:
class SOQLQueryEngine {
    String translateToSQL(String soql, UUID orgId) {
        // Parse SOQL: SELECT Revenue__c, Name FROM CustomWidget__c WHERE Revenue__c > 1000
        SOQLParser.Query parsed = SOQLParser.parse(soql);
        
        // Resolve field → pivot column mappings
        Map<String, String> fieldMapping = metadataService.getFieldMappings(orgId, parsed.objectType);
        
        // Build SQL
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT record_id");
        
        for (String field : parsed.selectFields) {
            String pivotCol = fieldMapping.get(field);
            sql.append(", ").append(pivotCol).append(" AS \"").append(field).append("\"");
        }
        
        sql.append(" FROM mt_data WHERE org_id = ?")  // ALWAYS filter by org_id
           .append(" AND object_type = ?");
        
        // Translate WHERE clause
        if (parsed.whereClause != null) {
            sql.append(" AND ").append(translateWhereClause(parsed.whereClause, fieldMapping));
        }
        
        // ENFORCE GOVERNOR LIMITS
        int limit = Math.min(parsed.limit, 50000); // Max 50K records per query
        sql.append(" LIMIT ").append(limit);
        
        return sql.toString();
    }
}

Governor Limits (Resource Quotas):
class GovernorLimitEnforcer {
    private final Map<String, AtomicInteger> counters = new ConcurrentHashMap<>();
    
    void checkLimit(UUID orgId, String limitType) {
        String key = orgId + ":" + limitType;
        int count = counters.computeIfAbsent(key, k -> new AtomicInteger(0)).incrementAndGet();
        
        int max = getLimitConfig(limitType);
        if (count > max) {
            throw new GovernorLimitException(
                "Limit exceeded: " + limitType + " (" + count + "/" + max + ")");
        }
    }
    
    // Per-transaction limits:
    // - Max 100 SOQL queries per transaction
    // - Max 50,000 rows returned per query
    // - Max 150 DML operations per transaction
    // - Max 10 seconds CPU time per transaction
    // - Max 6MB heap size per transaction
    // - Max 100 callouts per transaction
}

Data Isolation:
1. Every query MUST include org_id in WHERE clause — enforced at ORM level
2. Row-Level Security: sharing rules per object per org
3. Field-Level Security: some fields visible only to certain profiles
4. Encryption at rest: tenant-specific encryption keys (BYOK)
5. Query result caching: keyed by org_id — never cross-org cache hits

Scale:
- 150K+ orgs on shared infrastructure
- 100B+ records in mt_data table
- Partitioned by org_id (range partitioning)
- Read replicas per region for SOQL queries
- Metadata cache (Redis): field definitions per org (~5ms lookup)
```

---

## 🎯 Key Takeaways
- Salesforce = **multi-tenancy is THE core challenge** — data isolation, governor limits, shared infra
- **LFU Cache**: two HashMaps (key→node, freq→DLL) + track minFreq — O(1) all operations
- **Pivot table model**: generic columns (val_text_01, val_num_01) mapped via metadata
- **SOQL translation**: resolve custom field names → pivot columns, always inject org_id filter
- **Governor limits**: hard quotas per transaction — prevents noisy neighbor problem
- **Data isolation**: org_id in every query (ORM enforced), encryption with tenant-specific keys
- **Custom indexes**: separate index table per indexed field — sparse indexing for efficiency
- Salesforce values: **trust, customer success, innovation** — know Apex, LWC, Salesforce platform

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Array, Strings |
| Coding | Hard | LFU Cache, O(1) Design |
| System Design | Hard | Multi-Tenant CRM, Pivot Table, SOQL |
| HM | Medium | Salesforce Values |
