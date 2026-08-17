# Salesforce — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Salesforce |
| **Role** | Member of Technical Staff (MTS) |
| **Level** | MTS-2 |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/salesforce-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical + Hiring Manager)
- **Timeline:** 3 weeks
- **Format:** Virtual
- **Note:** Salesforce tests CRM domain knowledge. Expect multi-tenancy and data isolation questions.

---

## Round 1: Online Assessment
**Duration:** 90 minutes | **Platform:** HackerEarth

### Questions Asked
1. **Find All Anagrams in a String** (LeetCode 438)
2. **Design Circular Queue** (LeetCode 622)
3. **MCQ: OOP, REST APIs, SQL**

### 💡 Interview-Ready Answer — Find All Anagrams

```java
public List<Integer> findAnagrams(String s, String p) {
    List<Integer> result = new ArrayList<>();
    if (s.length() < p.length()) return result;
    
    int[] pCount = new int[26];
    int[] sCount = new int[26];
    
    for (char c : p.toCharArray()) pCount[c - 'a']++;
    
    for (int i = 0; i < s.length(); i++) {
        sCount[s.charAt(i) - 'a']++;
        
        // Remove left side of window
        if (i >= p.length()) {
            sCount[s.charAt(i - p.length()) - 'a']--;
        }
        
        if (Arrays.equals(sCount, pCount)) {
            result.add(i - p.length() + 1);
        }
    }
    return result;
}
```
**Time:** O(n), **Space:** O(1) (fixed 26-char array)

---

## Round 2: Technical — DSA + Java Deep Dive
**Duration:** 60 minutes | **Interviewer:** Lead MTS

### Questions Asked
1. **Flatten a Multilevel Doubly Linked List** (LeetCode 430)
2. **Java Internals:** HashMap collision handling, ConcurrentHashMap segments, volatile vs synchronized
3. **Design Pattern:** Implement Observer pattern

### 💡 Interview-Ready Answer — Flatten Multilevel DLL

```java
public Node flatten(Node head) {
    if (head == null) return null;
    
    Node current = head;
    while (current != null) {
        if (current.child != null) {
            Node child = current.child;
            Node next = current.next;
            
            // Find tail of child list
            Node childTail = child;
            while (childTail.next != null) childTail = childTail.next;
            
            // Stitch child list into main list
            current.next = child;
            child.prev = current;
            current.child = null;
            
            if (next != null) {
                childTail.next = next;
                next.prev = childTail;
            }
        }
        current = current.next;
    }
    return head;
}
```

### 💡 Interview-Ready Answer — Observer Pattern

```java
interface Observer {
    void update(String event, Object data);
}

interface Subject {
    void subscribe(String event, Observer observer);
    void unsubscribe(String event, Observer observer);
    void notify(String event, Object data);
}

class EventManager implements Subject {
    private final Map<String, Set<Observer>> listeners = new ConcurrentHashMap<>();
    
    @Override
    public void subscribe(String event, Observer observer) {
        listeners.computeIfAbsent(event, k -> ConcurrentHashMap.newKeySet()).add(observer);
    }
    
    @Override
    public void unsubscribe(String event, Observer observer) {
        Set<Observer> observers = listeners.get(event);
        if (observers != null) observers.remove(observer);
    }
    
    @Override
    public void notify(String event, Object data) {
        Set<Observer> observers = listeners.get(event);
        if (observers != null) {
            for (Observer observer : observers) {
                observer.update(event, data);
            }
        }
    }
}

// Usage:
class PriceAlert implements Observer {
    @Override
    public void update(String event, Object data) {
        System.out.println("Price changed to: " + data);
    }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes | **Interviewer:** Principal Engineer

### Questions Asked
1. **Design a Multi-Tenant CRM Platform** (like Salesforce)

### 💡 Interview-Ready Answer

#### Architecture
```
┌──────────────────────────────────────────────────────────────┐
│                    Tenant Layer                                │
│  Tenant A (Acme Corp)    Tenant B (Widget Inc)               │
│  ┌──────────────────┐   ┌──────────────────┐                │
│  │ Custom Objects    │   │ Custom Objects    │                │
│  │ Custom Fields     │   │ Custom Fields     │                │
│  │ Workflows         │   │ Workflows         │                │
│  │ Permissions       │   │ Permissions       │                │
│  └────────┬─────────┘   └────────┬─────────┘                │
└───────────┼──────────────────────┼────────────────────────────┘
            │                      │
            ▼                      ▼
┌──────────────────────────────────────────────────────────────┐
│                    Application Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ API Gateway   │  │ Auth Service │  │ Query Engine │       │
│  │ (tenant ID   │  │ (OAuth 2.0,  │  │ (SOQL →SQL   │       │
│  │  extraction) │  │  SAML, SSO)  │  │  translation)│       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Workflow      │  │ Metadata     │  │ Apex Runtime │       │
│  │ Engine        │  │ Service      │  │ (custom code │       │
│  │ (triggers,   │  │ (schema      │  │  execution)  │       │
│  │  automations)│  │  per tenant) │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└──────────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────┐
│                    Data Layer                                  │
│                                                                │
│  Multi-Tenancy Strategy: Shared Database, Shared Schema       │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  PostgreSQL Cluster                                    │    │
│  │                                                        │    │
│  │  Every table has: tenant_id (partition key)           │    │
│  │  Row-Level Security (RLS) enforced at DB level        │    │
│  │                                                        │    │
│  │  contacts:                                             │    │
│  │  | tenant_id | id | name | email | custom_fields_json │    │
│  │  | acme_01   | 1  | John | j@..  | {"industry":"tech"}│    │
│  │  | widget_02 | 2  | Jane | ja@.. | {"size":"50-100"} │    │
│  │  └──────────────────────────────────────────────────┘ │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

#### Multi-Tenancy: Data Isolation

```sql
-- Row-Level Security (PostgreSQL)
-- CRITICAL: Every query MUST be scoped to tenant_id

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their tenant's data
CREATE POLICY tenant_isolation ON contacts
    USING (tenant_id = current_setting('app.current_tenant')::text);

-- Application sets tenant context on every request
-- SET app.current_tenant = 'acme_01';

-- Now: SELECT * FROM contacts; 
-- Returns ONLY acme_01's contacts. Widget's data is invisible.
```

#### Custom Fields (Metadata-Driven Schema)
```java
// Salesforce's approach: Entity-Attribute-Value (EAV) + JSON columns

class MetadataService {
    // Each tenant can define custom fields on any object
    // Stored as metadata, not actual DB columns
    
    void addCustomField(String tenantId, String objectType, CustomFieldDef field) {
        // Store field definition
        // { tenantId: "acme", object: "Contact", fieldName: "industry", 
        //   type: "PICKLIST", required: true, options: ["Tech","Finance","Healthcare"] }
        metadataStore.save(tenantId, objectType, field);
        
        // For performance, custom fields stored in a JSONB column per row
        // NOT as separate columns (would break shared schema for other tenants)
    }
    
    // SOQL → SQL translation with custom fields
    // SOQL: SELECT Name, Industry__c FROM Contact WHERE Industry__c = 'Tech'
    // SQL:  SELECT name, custom_fields->>'industry' FROM contacts 
    //       WHERE tenant_id = 'acme' AND custom_fields->>'industry' = 'Tech'
}
```

#### Governor Limits (Resource Isolation)
```
Per-tenant resource limits (prevent noisy neighbor):
- API calls: 100K/day (Enterprise), 15K/day (Basic)
- SOQL queries per transaction: 100
- DML statements per transaction: 150  
- CPU time per transaction: 10 seconds
- Heap size: 6MB (sync), 12MB (async)
- Custom objects: 200 per tenant

Enforced at application layer with counters per transaction context.
```

---

## Round 4: LLD + Architecture Discussion
**Duration:** 45 minutes | **Interviewer:** Architect

### Questions Asked
1. **Design a Workflow Automation Engine**
   - "When a Lead's status changes to 'Qualified', automatically create an Opportunity and send email to sales rep"

### 💡 Interview-Ready Answer

```java
interface Trigger {
    boolean evaluate(RecordChangeEvent event);
}

interface Action {
    void execute(Map<String, Object> context);
}

class WorkflowRule {
    String ruleId;
    String tenantId;
    String objectType;        // "Lead"
    String triggerEvent;      // "AFTER_UPDATE"
    List<Trigger> conditions; // field change conditions
    List<Action> actions;     // what to do when triggered
    boolean isActive;
}

// Example: When Lead status changes to 'Qualified'
class FieldChangeTrigger implements Trigger {
    String fieldName;
    Object expectedOldValue; // null = any
    Object expectedNewValue;
    
    @Override
    public boolean evaluate(RecordChangeEvent event) {
        Object oldVal = event.getOldValues().get(fieldName);
        Object newVal = event.getNewValues().get(fieldName);
        
        boolean changed = !Objects.equals(oldVal, newVal);
        boolean matchesNew = expectedNewValue == null || expectedNewValue.equals(newVal);
        boolean matchesOld = expectedOldValue == null || expectedOldValue.equals(oldVal);
        
        return changed && matchesNew && matchesOld;
    }
}

class CreateRecordAction implements Action {
    String objectType;
    Map<String, String> fieldMappings; // targetField → expression/value
    
    @Override
    public void execute(Map<String, Object> context) {
        Map<String, Object> newRecord = new HashMap<>();
        for (var entry : fieldMappings.entrySet()) {
            newRecord.put(entry.getKey(), resolveExpression(entry.getValue(), context));
        }
        recordService.create(objectType, newRecord);
    }
}

class SendEmailAction implements Action {
    String templateId;
    String recipientExpression; // e.g., "{Lead.Owner.Email}"
    
    @Override
    public void execute(Map<String, Object> context) {
        String recipient = resolveExpression(recipientExpression, context);
        String body = templateService.render(templateId, context);
        emailService.sendAsync(recipient, body);
    }
}

class WorkflowEngine {
    Map<String, List<WorkflowRule>> rulesByObject; // objectType → rules
    
    void onRecordChange(RecordChangeEvent event) {
        String tenantId = event.getTenantId();
        String objectType = event.getObjectType();
        
        List<WorkflowRule> rules = rulesByObject.getOrDefault(objectType, List.of());
        
        for (WorkflowRule rule : rules) {
            if (!rule.isActive || !rule.tenantId.equals(tenantId)) continue;
            if (!rule.triggerEvent.equals(event.getEventType())) continue;
            
            boolean allConditionsMet = rule.conditions.stream()
                .allMatch(trigger -> trigger.evaluate(event));
            
            if (allConditionsMet) {
                Map<String, Object> context = buildContext(event);
                for (Action action : rule.actions) {
                    try {
                        action.execute(context);
                    } catch (Exception e) {
                        log.error("Workflow action failed: rule={}, action={}", rule.ruleId, action, e);
                        // Continue with other actions (don't fail entire workflow)
                    }
                }
            }
        }
    }
}
```

---

## Round 5: Hiring Manager
**Duration:** 45 minutes

### Questions Asked
1. **"How do you balance feature work with platform stability?"**
2. **"Describe your experience with large-scale multi-tenant systems"**

---

## 🎯 Key Takeaways
- Salesforce interviews test **multi-tenancy** — know shared DB with RLS, EAV pattern, governor limits
- **Observer pattern** and **Workflow Automation** are Salesforce-specific LLD questions
- **SOQL → SQL translation** is a unique topic — understand query engines
- **Row-Level Security** at database level is critical for data isolation
- **Custom Fields** via JSONB + metadata is how Salesforce allows per-tenant schema customization
- Java internals (HashMap, ConcurrentHashMap, volatile) are tested more than at FAANG

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Sliding Window, Queue |
| Round 2 | Medium-Hard | Linked List, Java Internals, Design Patterns |
| Round 3 | Very Hard | Multi-Tenancy, CRM, Data Isolation |
| Round 4 | Hard | Workflow Engine, Event-Driven |
| Round 5 | Medium | Behavioral |
