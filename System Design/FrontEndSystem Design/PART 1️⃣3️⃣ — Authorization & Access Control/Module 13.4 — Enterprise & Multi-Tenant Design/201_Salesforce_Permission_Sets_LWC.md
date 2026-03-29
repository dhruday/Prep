# 201 – Salesforce Permission Sets & LWC Context ★

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Salesforce's permission model is built on two pillars: **Profiles** (baseline permissions every user has) and **Permission Sets** (additive permissions layered on top of the Profile). In Lightning Web Components (LWC), authorization is enforced through the platform's metadata-driven access control — components declare which permissions they need, and the platform prevents access to Apex methods, objects, and fields that the user's effective permission set doesn't include. For frontend engineers targeting Salesforce interviews, the critical knowledge areas are: how `@AuraEnabled` endpoints respect object/field-level permissions, how LWC uses `lightning/uiRecordApi` and the `UserInfo` module for permission-aware rendering, and how to use `@wire(getPermissionSet)` patterns or `FeatureManagement.checkPermission()` for custom permission checks in LWC.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Salesforce Permission Hierarchy

```
System Administrator Profile
    │
    ├─ Base CRUD on all objects (from Profile)
    ├─ + Permission Set: "Finance Approver"
    │       └─ Approve invoices, view salary fields
    ├─ + Permission Set Group: "Sales Suite"
    │       ├─ PS: "Lead Management"
    │       └─ PS: "Opportunity Management"
    └─ Custom Permissions (granular boolean flags)
```

### Profile vs Permission Set

| Aspect | Profile | Permission Set |
|---|---|---|
| Assignment | One per user | Multiple per user |
| Purpose | Baseline access | Additive, specific access |
| Object access | Yes | Yes (additive only) |
| Field level | Yes | Yes (additive only) |
| Custom permissions | No | Yes |

### LWC Permission Checking Patterns

**Pattern 1: Server-side via Apex `FeatureManagement`**

```java
// Apex — check Custom Permission in LWC controller
@AuraEnabled(cacheable=true)
public static Map<String, Boolean> getUserPermissions() {
    return new Map<String, Boolean>{
        'canApproveInvoice' => FeatureManagement.checkPermission('Approve_Invoice'),
        'canViewSalary' => Schema.sObjectType.Employee__c
                             .fields.Salary__c.isAccessible()
    };
}
```

**Pattern 2: Wire via `@salesforce/userInfo` and `@salesforce/featureManagement`**

```javascript
// LWC — wire permission info
import hasApprovePermission from '@salesforce/customPermission/Approve_Invoice';
import { LightningElement } from 'lwc';

export default class InvoiceApproval extends LightningElement {
    get canApprove() {
        return hasApprovePermission; // evaluated at compile-deploy time from token
    }
}
```

**Pattern 3: CRUD/FLS check via `lightning/uiRecordApi`**

```javascript
// Field-Level Security: if field isn't accessible, getFieldValue returns undefined
import { getFieldValue } from 'lightning/uiRecordApi';
import SALARY_FIELD from '@salesforce/schema/Employee__c.Salary__c';

// If user lacks FLS read on Salary__c, getFieldValue returns undefined
const salary = getFieldValue(record, SALARY_FIELD);
const showSalary = salary !== undefined; // FLS-aware conditional render
```

### Sharing Rules and Record-Level Access

Salesforce object/record permissions flow:

```
OWD (Org-Wide Default: Private/Public/Read-Only)
  → Role Hierarchy (managers see subordinate records)
  → Sharing Rules (additional criteria-based sharing)
  → Manual Sharing (one-off)
  → Teams (Account/Opportunity teams)
```

For LWC, `lightning/uiRecordApi` automatically respects all sharing rules — `getRecord` only returns a record if the user has **at least Read** access through any sharing mechanism.

### Apex Running Without Sharing

```java
// DEFAULT — respects sharing rules
public class InvoiceController { ... }

// Explicit — ignores sharing rules (admin context — use sparingly)
public without sharing class AdminInvoiceController { ... }

// Inherit caller's sharing context
public inherited sharing class InvoiceController { ... }
```

### Custom Permission Flags

Custom Permissions are boolean feature flags within the Salesforce permission model. Unlike object/field permissions, they're arbitrary named capabilities:

```java
// Org Setup → Custom Permissions → "Send_Mass_Email"
// Add to Permission Set → grant to specific users

// In Apex:
FeatureManagement.checkPermission('Send_Mass_Email');

// In LWC (compile-time constant):
import hasSendMassEmail from '@salesforce/customPermission/Send_Mass_Email';
```

### Anti-Patterns

- ❌ Using `without sharing` in general purpose Apex controllers (bypasses all sharing rules)
- ❌ Client-side permission check only in LWC (Apex always enforces FLS/CRUD)
- ❌ SOQL injection via dynamic SOQL in Apex (`escapeSingleQuotes` is required)
- ❌ Exposing fields in `@AuraEnabled` response that user doesn't have FLS read on
- ❌ Storing permission state in LWC local state and not re-fetching after user session changes

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Salesforce Internal — AppExchange ISV Permission Model

Salesforce's own AppExchange apps use Permission Sets to grant the minimum required access. ISV apps declare their Permission Sets in the package, and admins decide which users get each set. This is the "least privilege" principle baked into the distribution model — the app itself can't force broad permissions.

### Enterprise LWC: Financial Services Cloud

In Salesforce Financial Services Cloud, relationship bankers see client financial health without seeing internal credit risk scores (FLS). Relationship managers see credit risk scores (Permission Set). Branch managers see all data (full Permission Set Group). LWC components use `getRecord` with field lists — if a field isn't FLS-accessible, it simply doesn't appear in the component.

### Hruday — LWC Context at Oracle (Salesforce-Adjacent pattern)

At Oracle, while not on Salesforce, we implemented a Salesforce-inspired permission model in our Angular ERP: Custom Permission flags (boolean feature gates) were stored in the JWT as an array of granted permissions, and LWC/Angular components imported them as compile-time constants using a custom webpack resolver. This made permission checks in templates look exactly like Salesforce's `@salesforce/customPermission` imports — easy to audit, easy to understand.

### Scaling:

In large Salesforce orgs with 1000+ permission sets, governance becomes critical. Best practices: create Permission Set Groups to bundle related permissions, use the standard "Minimum Access" profile as the base, and never put customizations in profiles (profiles are hard to maintain at scale).

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Salesforce's permission model has three layers that every LWC developer must understand: Profiles (baseline per user), Permission Sets (additive, multiple per user), and Custom Permissions (boolean feature flags). In LWC, I check permissions using three mechanisms: (1) `@salesforce/customPermission/PermName` for custom boolean flags evaluated at session load; (2) `FeatureManagement.checkPermission()` in Apex for server-side checks; and (3) `lightning/uiRecordApi` for field-level access — if a field lacks FLS access, `getFieldValue` returns `undefined` and I conditionally hide the field.*

*The sharing model governs record-level access: OWD defines the default visibility, role hierarchy propagates upward, and sharing rules add criteria-based exceptions. In Apex controllers, I always use `with sharing` (the default) unless there's a specific, documented reason to bypass it. `without sharing` should be used only for specific admin operations and documented heavily — it bypasses all sharing rules.*

*The key interview insight: Apex enforces FLS/CRUD automatically for DML and SOQL, but if you use dynamic SOQL or manual SObject construction, you must check `Schema.sObjectType.Object__c.isCreateable()` explicitly."*

### Follow-up Questions

1. **"What's the difference between Profile and Permission Set?"** — Profile: one per user, defines baseline. Permission Set: additive, multiple per user. Modern best practice: Minimum Access profile + Permission Sets for everything.
2. **"How does `with sharing` vs `without sharing` affect LWC?"** — `with sharing` (default) enforces sharing rules. `without sharing` ignores them — Apex runs as if it can see all records. Always document why you use `without sharing`.
3. **"How do you check Field Level Security in Apex?"** — `Schema.sObjectType.Object__c.fields.Field__c.isAccessible()`. For bulk: use `Security.stripInaccessible()` to remove inaccessible fields from query results.
4. **"What is a Custom Permission and how do you use it in LWC?"** — A boolean flag in Salesforce setup assigned via Permission Sets. In LWC: `import hasFlagName from '@salesforce/customPermission/FlagName'`.
5. **"How do you prevent SOQL injection in Apex?"** — Use bind variables (`:userId` in SOQL), not string concatenation. If dynamic SOQL is unavoidable, use `String.escapeSingleQuotes()`.

### Comparison Table

| Access Type | Where defined | Who checks it | Mechanism |
|---|---|---|---|
| Object CRUD | Profile / Permission Set | Apex / SOQL automatically | Schema.sObjectType.isCreateable() |
| Field Level (FLS) | Profile / Permission Set | Apex / uiRecordApi | getFieldValue returns undefined |
| Record sharing | OWD + Hierarchy + Rules | with sharing keyword | Apex sharing enforcement |
| Custom Permission | Custom Permission + PS | FeatureManagement | @salesforce/customPermission |
| LWC component | Connected App / Profile | Platform level | LWC visibility config |

### Trade-offs

- `without sharing` is necessary to allow apex triggers/jobs to operate across records — use `inherited sharing` as a safer default
- Custom Permissions vs permission sets for feature flags: Custom Permissions are more granular and don't require object access
- `@AuraEnabled(cacheable=true)` caches the Apex response — permission changes may not be reflected until cache TTL expires (3 seconds to 5 minutes depending on storage)

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```javascript
// LWC — Permission-aware component using Custom Permission + FLS
import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

// Custom Permission import — compile-time boolean
import hasApprovePermission from '@salesforce/customPermission/Approve_Invoice';
import hasViewSalary from '@salesforce/customPermission/View_Salary_Fields';

// Schema imports — FLS-aware field access
import AMOUNT_FIELD from '@salesforce/schema/Invoice__c.Amount__c';
import INTERNAL_NOTES_FIELD from '@salesforce/schema/Invoice__c.Internal_Notes__c';
import STATUS_FIELD from '@salesforce/schema/Invoice__c.Status__c';

const FIELDS = [AMOUNT_FIELD, STATUS_FIELD, INTERNAL_NOTES_FIELD];

export default class InvoiceDetail extends LightningElement {
    @api recordId;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    invoice;

    // FLS-aware: if field not accessible, getFieldValue returns undefined
    get amount() { return getFieldValue(this.invoice.data, AMOUNT_FIELD); }
    get status() { return getFieldValue(this.invoice.data, STATUS_FIELD); }

    // Internal notes visible only if FLS allows AND custom permission granted
    get internalNotes() {
        const flsValue = getFieldValue(this.invoice.data, INTERNAL_NOTES_FIELD);
        return (hasViewSalary && flsValue !== undefined) ? flsValue : null;
    }

    get canApprove() { return hasApprovePermission; }
    get showInternalNotes() { return this.internalNotes !== null; }
}
```

```html
<!-- InvoiceDetail.html — permission-adaptive template -->
<template>
    <!-- Always visible if user has record access -->
    <div class="amount">{amount}</div>
    <div class="status">{status}</div>

    <!-- FLS + Custom Permission gate -->
    <template if:true={showInternalNotes}>
        <div class="internal-notes">{internalNotes}</div>
    </template>

    <!-- Custom Permission gate — removed from DOM if false -->
    <template if:true={canApprove}>
        <lightning-button label="Approve Invoice"
                          onclick={handleApprove}
                          variant="brand">
        </lightning-button>
    </template>
</template>
```

```java
// Apex — with sharing (default, recommended)
public with sharing class InvoiceController {
    @AuraEnabled(cacheable=true)
    public static Invoice__c getInvoice(Id recordId) {
        // Respects FLS and sharing rules
        return [
            SELECT Id, Amount__c, Status__c, Internal_Notes__c
            FROM Invoice__c
            WHERE Id = :recordId
            // sharing rules automatically applied
        ];
    }

    @AuraEnabled
    public static void approveInvoice(Id recordId) {
        // Check Custom Permission server-side too
        if (!FeatureManagement.checkPermission('Approve_Invoice')) {
            throw new AuraHandledException('Unauthorized: Approve_Invoice permission required');
        }
        // Proceed with approval...
    }
}
```

**Why this structure:**
- Custom Permission imports are compile-time constants — no async check needed in template
- `getFieldValue` returns `undefined` automatically for inaccessible fields — safe to check
- `with sharing` is explicit — reviewer immediately knows sharing is respected
- Server-side permission check in `approveInvoice` mirrors client-side check — security in depth

**Interviewer focus:** Custom Permission import pattern, `with sharing`, `getFieldValue` FLS behavior, `FeatureManagement.checkPermission`

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Profile = floor, Permission Set = ceiling additions."** One profile per user (baseline), many permission sets (additions). In LWC: three ways to check permissions — `@salesforce/customPermission/Name` (compile-time flag), `getFieldValue` returns `undefined` if FLS blocks (field-level), `with sharing` Apex gets only authorized records (row-level). Never use `without sharing` without a documented reason. Custom Permissions are boolean gates — the LWC equivalent of feature flags. SOQL injection prevention: always bind variables, never string concatenate into dynamic SOQL.

*If you go blank*: "Profile baseline + Permission Sets additive. LWC: custom permission import, getFieldValue undefined = FLS blocked, with sharing = respects record access."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
- Salesforce permission model is deeply integrated — LWC components that ignore FLS/sharing can expose data that the platform is supposed to protect
- `without sharing` is the #1 security misconfiguration in Apex code — it silently bypasses all record-level security
- Custom Permissions enable fine-grained feature flags without requiring object-level permission sets — critical for advanced LWC UI control

**How it works:**
When a user opens a record in LWC, `lightning/uiRecordApi` fetches the record and automatically applies FLS — fields the user can't see return as `undefined`. Custom Permission imports are resolved at component load time from the session's effective permission set. Apex methods run `with sharing` by default, filtering queries based on Salesforce sharing rules. `FeatureManagement.checkPermission()` provides an explicit programmatic check for Custom Permissions in Apex.

**Company-specific relevance:**
- **Salesforce**: This IS the Salesforce platform — knowing Profile vs Permission Set, `with sharing`, `getFieldValue` FLS behavior, and Custom Permissions is foundational for any Salesforce frontend engineer role
- **Microsoft**: Dynamics 365 has an analogous security model based on Business Units, Security Roles, and Field Security Profiles — the concepts directly transfer
- **Adobe**: Adobe Experience Platform uses permission grants within an Organization structure similar to Salesforce's Org/Profile model — administrative access layers
- **Cisco**: Cisco's enterprise software portals (Cisco.com, partner portals) use permission set-style access for partner tiers — similar additive permission layering
