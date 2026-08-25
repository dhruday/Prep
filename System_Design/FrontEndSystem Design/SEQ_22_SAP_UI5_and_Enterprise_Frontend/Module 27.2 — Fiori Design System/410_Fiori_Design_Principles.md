# 410 – Fiori Design System — Principles and Guidelines

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**SAP Fiori** is SAP's design language for enterprise UX. 5 principles: **Role-based**, **Adaptive**, **Simple**, **Coherent**, **Delightful**. Fiori Design Guidelines prescribe layout patterns (master-detail, object page), interaction patterns, and visual specs. Fiori Elements generates CRUD UIs from OData metadata.

## 2. 🔬 DEEP-DIVE EXPLANATION

### 5 Fiori Principles
```
1. ROLE-BASED    — Show only what the user needs for their role
2. ADAPTIVE      — Works across desktop, tablet, mobile
3. SIMPLE        — 1:1:3 rule (1 user, 1 use case, 3 clicks max)
4. COHERENT      — Consistent UX across all SAP products
5. DELIGHTFUL    — Beautiful, responsive, enjoyable to use
```

### Fiori App Types
| Type | Use Case | Example |
|---|---|---|
| **Transactional** | Create/edit business objects | Purchase Order creation |
| **Analytical** | Charts, KPIs, data visualization | Sales dashboard |
| **Fact Sheet** | Read-only object details | Employee profile |
| **Fiori Elements** | Auto-generated from OData annotations | CRUD list/detail |

### Fiori Elements (No-Code UI)
```javascript
// Fiori Elements generates UI from OData annotations
// No custom views needed — just annotate the OData service

// CDS View annotations (backend):
// @UI.lineItem: [{ position: 10, label: 'Product' }]
// @UI.identification: [{ position: 10 }]
// @UI.selectionField: [{ position: 10 }]

// manifest.json — Fiori Elements configuration
/*
{
  "sap.ui.generic.app": {
    "pages": [{
      "entitySet": "Products",
      "component": {
        "name": "sap.suite.ui.generic.template.ListReport"
      },
      "pages": [{
        "entitySet": "Products",
        "component": {
          "name": "sap.suite.ui.generic.template.ObjectPage"
        }
      }]
    }]
  }
}
*/
// → Generates a complete List Report + Object Page CRUD app
//   with search, filter, sort, create, edit, delete
```

### Key Fiori Patterns
```
MASTER-DETAIL     : List on left → detail on right (SplitApp)
LIST REPORT       : Filterable table with actions
OBJECT PAGE       : Header + sections with forms/tables
WORKLIST          : Task list with status actions
WIZARD            : Multi-step guided process
OVERVIEW PAGE     : Cards/tiles dashboard for role-based overview
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Fiori's 5 principles enforce enterprise UX consistency. Fiori Elements auto-generates CRUD UIs from OData annotations — massive productivity for standard patterns. At SAP, I built both custom Fiori apps and extended Fiori Elements templates when standard patterns weren't sufficient."*

## 4. 🧠 MEMORY AID
**"5 principles: Role-based, Adaptive, Simple, Coherent, Delightful (RASCD). Fiori Elements = auto-generated UI from OData annotations. Key patterns: List Report, Object Page, Master-Detail."**
