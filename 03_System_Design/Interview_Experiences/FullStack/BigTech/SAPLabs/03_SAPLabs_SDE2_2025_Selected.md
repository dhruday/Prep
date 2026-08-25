# SAP Labs — SDE-2 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP Labs |
| **Role** | SDE-2 |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/sap-labs-interview-experience/) |
| **Author** | Anonymous |
| **Team** | SAP BTP (Business Technology Platform) |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Design Iterator with Peeking Capability** (LeetCode 284)
2. **Merge Intervals** (LeetCode 56)
3. **Follow-up: Stream of intervals arriving one-by-one, maintain merged state**

### 💡 Peeking Iterator

```java
class PeekingIterator<T> implements Iterator<T> {
    private final Iterator<T> iterator;
    private T peekedValue;
    private boolean hasPeeked;
    
    PeekingIterator(Iterator<T> iterator) {
        this.iterator = iterator;
        this.hasPeeked = false;
    }
    
    public T peek() {
        if (!hasPeeked) {
            peekedValue = iterator.next();
            hasPeeked = true;
        }
        return peekedValue;
    }
    
    @Override
    public T next() {
        if (hasPeeked) {
            hasPeeked = false;
            T val = peekedValue;
            peekedValue = null; // Allow GC
            return val;
        }
        return iterator.next();
    }
    
    @Override
    public boolean hasNext() {
        return hasPeeked || iterator.hasNext();
    }
}
// Time: O(1) per operation | Space: O(1) extra
```

### 💡 Streaming Merge Intervals (Online Algorithm)

```java
class StreamingIntervalMerger {
    private TreeMap<Integer, Integer> intervals = new TreeMap<>(); // start → end
    
    /**
     * Add interval [start, end] and maintain merged state.
     * Time: O(k log n) where k = number of overlapping intervals removed
     * Amortized: O(log n) since each interval is inserted and removed at most once
     */
    void addInterval(int start, int end) {
        if (start > end) throw new IllegalArgumentException("Invalid interval");
        
        // Find the entry just before or at 'start'
        Map.Entry<Integer, Integer> floor = intervals.floorEntry(start);
        
        int mergedStart = start;
        int mergedEnd = end;
        
        // Check if floor interval overlaps (extends to or past our start)
        if (floor != null && floor.getValue() >= start - 1) {
            mergedStart = floor.getKey();
            mergedEnd = Math.max(mergedEnd, floor.getValue());
        }
        
        // Remove all intervals that overlap with [mergedStart, mergedEnd]
        // Check intervals with start keys from mergedStart to mergedEnd
        while (true) {
            Map.Entry<Integer, Integer> higher = intervals.higherEntry(mergedStart);
            if (higher == null || higher.getKey() > mergedEnd + 1) break;
            
            mergedEnd = Math.max(mergedEnd, higher.getValue());
            intervals.remove(higher.getKey());
        }
        
        // Also remove floor if it was included
        if (floor != null && floor.getValue() >= start - 1) {
            intervals.remove(floor.getKey());
        }
        
        intervals.put(mergedStart, mergedEnd);
    }
    
    List<int[]> getIntervals() {
        return intervals.entrySet().stream()
            .map(e -> new int[]{e.getKey(), e.getValue()})
            .toList();
    }
}
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design an Event-Driven ERP Module Integration System**
   - Multiple ERP modules: HR, Finance, Procurement, Inventory
   - Events from one module trigger workflows in others
   - Example: "Employee hired" → HR creates record → Finance sets up payroll → IT provisions equipment
   - Guarantee: at-least-once delivery, ordered within a module
   - Scale: 1M events/day, 500 module integrations

### 💡 Event-Driven ERP Architecture

```
Architecture:
┌──────────────────────────────────────────────────────┐
│                     API Gateway                       │
│              (Auth, Rate Limit, Routing)              │
└─────────────────┬────────────────────────────────────┘
                  │
      ┌───────────▼────────────┐
      │    Event Bus (Kafka)    │
      │   Topics per domain:    │
      │   • hr.employee.*       │
      │   • finance.payroll.*   │
      │   • procurement.po.*    │
      │   • inventory.stock.*   │
      │                         │
      │   Partitioned by:       │
      │   entity_id (ordered    │
      │   per entity)           │
      └───┬───┬───┬───┬────────┘
          │   │   │   │
    ┌─────▼┐ ┌▼───┐ ┌▼──────┐ ┌▼──────────┐
    │  HR  │ │FIN │ │PROCURE│ │ INVENTORY  │
    │Module│ │    │ │  MENT │ │            │
    └──┬───┘ └─┬──┘ └──┬────┘ └────┬──────┘
       │       │       │           │
    ┌──▼───────▼───────▼───────────▼──────┐
    │       Workflow Orchestrator           │
    │  (Temporal / Camunda / Custom)        │
    │                                       │
    │  Workflow: OnboardNewEmployee          │
    │  ├─ Step 1: HR → Create employee      │
    │  ├─ Step 2: Finance → Setup payroll   │
    │  ├─ Step 3: IT → Provision laptop     │
    │  ├─ Step 4: Procurement → Order desk  │
    │  └─ Step 5: HR → Send welcome email   │
    │                                       │
    │  Saga Pattern: compensating actions   │
    │  if Step 3 fails → rollback 1,2       │
    └──────────────────────────────────────┘

Event Schema (CloudEvents spec):
{
  "specversion": "1.0",
  "type": "hr.employee.hired",
  "source": "/hr/module",
  "id": "evt-uuid-123",          // Idempotency key
  "time": "2025-03-15T10:30:00Z",
  "datacontenttype": "application/json",
  "subject": "employee/EMP-5678",
  "data": {
    "employeeId": "EMP-5678",
    "name": "Jane Doe",
    "department": "Engineering",
    "startDate": "2025-04-01",
    "manager": "EMP-1234",
    "location": "Bangalore",
    "grade": "IC3"
  }
}

Subscription Registry (DB):
┌──────────────────────────────────────────────────────────┐
│ subscription_id │ event_type      │ subscriber │ filter  │
├──────────────────────────────────────────────────────────┤
│ sub-001         │ hr.employee.*   │ finance    │ null    │
│ sub-002         │ hr.employee.hired│ it-provisioning│ {grade: "IC*"}│
│ sub-003         │ finance.invoice.approved│procurement│{amount>10000}│
└──────────────────────────────────────────────────────────┘

Delivery Guarantees:
┌─────────────────────────────────────────────────┐
│ Outbox Pattern (per module):                     │
│                                                  │
│ 1. Module writes event to local outbox table     │
│    within same DB transaction as business data   │
│                                                  │
│ 2. Outbox relay (CDC / polling) publishes to     │
│    Kafka — guarantees at-least-once              │
│                                                  │
│ 3. Consumer uses idempotency key (event.id)      │
│    to deduplicate — stored in Redis with         │
│    24h TTL                                       │
│                                                  │
│ Dead Letter Queue:                               │
│ • After 3 retries with exponential backoff       │
│ • Alert ops team via PagerDuty                   │
│ • Manual replay from DLQ dashboard               │
└─────────────────────────────────────────────────┘

Ordering Guarantee:
- Kafka partitions by entity_id (e.g., employee_id)
- All events for one entity land on same partition → ordered
- Cross-entity ordering NOT guaranteed (not needed for ERP)
- Workflow orchestrator enforces step ordering within a saga
```

---

## 🎯 Key Takeaways
- SAP Labs = **ERP domain knowledge + event-driven architecture + workflow orchestration**
- **Peeking Iterator**: buffer one element, restore on `next()`, clean pattern for iterator decoration
- **Streaming Merge Intervals**: `TreeMap` (BST) allows O(log n) floor/ceiling queries — key insight for online interval problems
- **Outbox Pattern**: write event to local outbox table in same transaction → relay to Kafka → at-least-once delivery
- **CloudEvents spec**: standard schema for events — interoperability across modules
- **Saga Pattern**: compensating actions (rollback) when a workflow step fails — crucial for multi-module ERP
- **Kafka partitioning**: by `entity_id` ensures ordered events per entity without global ordering overhead
- SAP interviews: **enterprise patterns matter** — know Temporal/Camunda, BPMN, CloudEvents, CDC

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Coding | Medium-Hard | Iterator Pattern, TreeMap Intervals |
| System Design | Hard | Event-Driven ERP, Saga, Outbox |
| HM | Medium | Culture Fit, Leadership |
