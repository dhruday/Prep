# 09 — Design BI Launchpad (Frontend System Design)

> ⚡ **Quick Summary:** A BI Launchpad is an enterprise business intelligence portal where users browse, schedule, and view reports and dashboards. Think SAP BusinessObjects, Tableau Server, or Power BI workspace. Key challenges: folder tree navigation with millions of nodes, report scheduling UI, user preference management, and accessibility for enterprise users.

---

## 🧠 Mental Model
Think of BI Launchpad as: **File Explorer (Windows Explorer) + Reports Viewer + Task Scheduler** — all enterprise-grade, accessible, and supporting thousands of concurrent users with different roles.

---

## PART 1 — Functional Requirements

```
Folder Tree:
  - Hierarchical folder navigation (breadcrumbs, expand/collapse)
  - Reports, dashboards, data sources as leaf nodes
  - Search within folders
  - Drag-and-drop to organize (for admins)
  - Virtual tree for 100K+ nodes

Reports:
  - View HTML/PDF reports in embedded viewer
  - Schedule reports (daily, weekly, custom cron)
  - Export: PDF, Excel, CSV
  - Report parameters/filters before running
  - Report history (previous runs)

User Preferences:
  - Default folder on login
  - UI language, date format, number format
  - Notification preferences (email on schedule failure)
  - Start page (specific folder or dashboard)

Enterprise Scale:
  - 50K+ users
  - 100K+ reports and documents
  - Role-based content visibility (RBAC)
  - Audit logging (who viewed what, when)
```

---

## PART 2 — Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        BROWSER                                │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  App Shell                                              │ │
│  │  ┌───────────┐ ┌─────────────────────────────────────┐ │ │
│  │  │  Sidebar  │ │  Main Content Area                  │ │ │
│  │  │  ┌──────┐ │ │  ┌─────────────────────────────┐   │ │ │
│  │  │  │Folder│ │ │  │  Report List / Viewer       │   │ │ │
│  │  │  │ Tree │ │ │  │  (breadcrumb navigation)    │   │ │ │
│  │  │  │(Virtual│ │  └─────────────────────────────┘   │ │ │
│  │  │  │ list) │ │  │                                   │ │ │
│  │  │  └──────┘ │ │  ┌─────────────────────────────┐   │ │ │
│  │  │           │ │  │  Report Viewer              │   │ │ │
│  │  │  Favorites│ │  │  (iframe / embed)           │   │ │ │
│  │  │  Recent   │ │  └─────────────────────────────┘   │ │ │
│  │  └───────────┘ └─────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘

Backend: REST API + WebSocket (for schedule status updates)
```

---

## PART 3 — Virtual Folder Tree

### Why Virtualization is Critical
```
Problem: A company might have 100,000 folders and 500,000 reports
Rendering all as DOM nodes = browser crash

Solution: Virtual tree with lazy loading
  - Only render visible nodes (~20-30)
  - Load children on demand (expand click)
  - Cache loaded children in memory
  - Debounce tree search (search-as-you-type)
```

### Implementation
```javascript
import { FixedSizeList } from 'react-window';

// Flatten tree for virtualization
const flattenTree = (nodes, expandedNodes) => {
  const flat = [];
  
  const traverse = (nodes, depth = 0) => {
    for (const node of nodes) {
      flat.push({ ...node, depth });
      if (expandedNodes.has(node.id) && node.children) {
        traverse(node.children, depth + 1);
      }
    }
  };
  
  traverse(nodes);
  return flat;
};

const FolderTree = ({ rootNodes }) => {
  const [expanded, setExpanded] = useState(new Set());
  const [flatNodes, setFlatNodes] = useState([]);
  
  useEffect(() => {
    setFlatNodes(flattenTree(rootNodes, expanded));
  }, [rootNodes, expanded]);
  
  const toggleExpand = async (node) => {
    if (!node.children) {
      // Lazy load children
      const children = await fetchChildren(node.id);
      node.children = children;
    }
    
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(node.id) ? next.delete(node.id) : next.add(node.id);
      return next;
    });
  };
  
  return (
    <FixedSizeList
      height={600}
      itemCount={flatNodes.length}
      itemSize={32}
      width="100%"
    >
      {({ index, style }) => {
        const node = flatNodes[index];
        return (
          <div
            style={{ ...style, paddingLeft: node.depth * 16 }}
            role="treeitem"
            aria-expanded={node.hasChildren ? expanded.has(node.id) : undefined}
            aria-level={node.depth + 1}
          >
            {node.hasChildren && (
              <button 
                onClick={() => toggleExpand(node)}
                aria-label={expanded.has(node.id) ? 'Collapse' : 'Expand'}
              >
                {expanded.has(node.id) ? '▼' : '▶'}
              </button>
            )}
            <span>{node.icon}</span>
            <span>{node.name}</span>
          </div>
        );
      }}
    </FixedSizeList>
  );
};
```

---

## PART 4 — Report Scheduling UI

```javascript
// Schedule form: cron expression builder
const ScheduleForm = ({ reportId, onSave }) => {
  const [schedule, setSchedule] = useState({
    type: 'daily',        // daily, weekly, monthly, custom
    time: '08:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
    outputFormat: 'pdf',
    destinations: [],     // email list
    parameters: {},       // report parameters
  });
  
  const handleSave = async () => {
    // Convert to cron expression
    const cron = buildCronExpression(schedule);
    await createSchedule({ reportId, cron, ...schedule });
    onSave();
  };
  
  return (
    <form>
      <fieldset>
        <legend>Frequency</legend>
        <RadioGroup value={schedule.type} onChange={t => setSchedule({...schedule, type: t})}>
          <Radio value="daily">Daily</Radio>
          <Radio value="weekly">Weekly</Radio>
          <Radio value="monthly">Monthly</Radio>
          <Radio value="custom">Custom (Cron)</Radio>
        </RadioGroup>
      </fieldset>
      
      <TimeInput
        label="Run at"
        value={schedule.time}
        onChange={time => setSchedule({...schedule, time})}
      />
      
      {schedule.type === 'weekly' && (
        <DayOfWeekSelector
          value={schedule.daysOfWeek}
          onChange={days => setSchedule({...schedule, daysOfWeek: days})}
        />
      )}
      
      <EmailListInput
        label="Send to"
        value={schedule.destinations}
        onChange={emails => setSchedule({...schedule, destinations: emails})}
      />
    </form>
  );
};
```

---

## PART 5 — Accessibility (Enterprise Critical)

```
Enterprise Accessibility Requirements:
  - WCAG 2.1 AA minimum (many companies require AA)
  - Section 508 compliance (US Government contractors)
  - EN 301 549 (European Standard)
  
Folder Tree Accessibility:
  role="tree" on container
  role="treeitem" on each node
  aria-expanded on expandable nodes
  aria-level for depth
  aria-selected for current node
  Keyboard: arrow keys to navigate, Enter to open, Space to expand

Report Viewer Accessibility:
  iframe title="Report: Monthly Sales Report"
  If PDF: provide HTML alternative
  Tables: proper headers, summary
  Charts: textual description (aria-label or alt text)
```

---

## 🎯 BI Launchpad Cheat Sheet

```
BI Launchpad = Virtual Tree + Report Viewer + Scheduler + RBAC + User Preferences

Key Technical Solutions:
  Virtual tree        → Only render visible nodes (react-window)
  Lazy load children  → Fetch on expand, cache in memory
  Schedule builder    → Friendly UI → generates cron expression
  Report viewer       → iframe with sandbox attribute for security
  Favorites/recent    → API-stored user preferences (not localStorage)
  WCAG compliance     → role="tree", aria-expanded, keyboard navigation

Enterprise Concerns:
  Audit log:   Every view/download tracked with timestamp + user
  Session:     Timeout after inactivity, warn 5 min before
  Data export: Watermark PDFs with username
  RBAC:        Never show report names if user can't access them
  Search:      Permission-aware (search results filtered by role)
```

---
---
---

# 10 — Design Large Enterprise SAP UI5 Application

> ⚡ **Quick Summary:** SAP UI5 (OpenUI5/SAPUI5) is a JavaScript framework for enterprise SAP applications, similar to React but enterprise-focused. Key patterns: OData v4 for data, SAPUI5 MVC architecture, declarative XML views, SAP Fiori design guidelines, and strict WCAG 2.1 AA compliance. This is niche but very important for SAP ecosystem interviews.

---

## 🧠 Mental Model
Think of SAP UI5 as: **Angular + enterprise patterns** — it has its own data binding, routing, model layer, and enforces SAP Fiori UX guidelines. You work within constraints of the framework, not against them.

```
SAP UI5 Architecture:
  View (XML/JS) → Controller (JS) → Model (OData/JSON) → SAP Backend
  
SAP Fiori Principles:
  1. Role-based         → Show only relevant info for user's role
  2. Responsive         → Works on desktop, tablet, mobile
  3. Coherent           → Consistent UI patterns across all apps
  4. Delightful         → Fast, intuitive, minimal clicks
  5. Simple             → One key action per screen
```

---

## PART 1 — OData Integration

### OData Model Setup
```javascript
// manifest.json (app descriptor)
{
  "sap.app": {
    "dataSources": {
      "mainService": {
        "uri": "/sap/opu/odata4/sap/zmy_service/default/sap/zmy_service/0001/",
        "type": "OData",
        "settings": {
          "odataVersion": "4.0"
        }
      }
    }
  },
  "sap.ui5": {
    "models": {
      "": {
        "dataSource": "mainService",
        "type": "sap.ui.model.odata.v4.ODataModel",
        "settings": {
          "autoExpandSelect": true,
          "operationMode": "Server",
          "synchronizationMode": "None"
        }
      }
    }
  }
}
```

### OData v4 List Binding
```javascript
// Controller.js
onInit: function() {
  // Bind table to OData entity set
  const oTable = this.byId("myTable");
  const oBinding = oTable.getBinding("items");
  
  // Apply filters and sorters
  oBinding.filter([
    new Filter("Status", FilterOperator.EQ, "ACTIVE"),
    new Filter("Department", FilterOperator.EQ, this._getDepartment()),
  ]);
  
  oBinding.sort([
    new Sorter("CreatedAt", true), // descending
  ]);
},

// Handle $batch requests automatically
// OData model batches all pending changes in one HTTP request
onSave: function() {
  const oModel = this.getModel();
  
  if (oModel.hasPendingChanges()) {
    oModel.submitBatch("myBatchGroup")
      .then(() => MessageToast.show("Saved successfully"))
      .catch((oError) => {
        MessageBox.error("Save failed: " + oError.message);
      });
  }
},
```

---

## PART 2 — Routing in SAP UI5

```javascript
// manifest.json routing config
{
  "sap.ui5": {
    "routing": {
      "config": {
        "routerClass": "sap.m.routing.Router",
        "type": "JSON",
        "target": {
          "type": "Component",
          "async": true
        }
      },
      "routes": [
        {
          "name": "master",
          "pattern": "",
          "target": "master"
        },
        {
          "name": "detail",
          "pattern": "Orders/{orderId}",
          "target": ["master", "detail"]
        },
        {
          "name": "notFound",
          "pattern": "NotFound",
          "target": "notFound"
        }
      ],
      "targets": {
        "master": {
          "id": "master",
          "type": "XMLView",
          "name": "Master",
          "controlAggregation": "masterPages"
        },
        "detail": {
          "id": "detail",
          "type": "XMLView",
          "name": "Detail",
          "controlAggregation": "detailPages"
        }
      }
    }
  }
}

// Navigate programmatically
this.getRouter().navTo("detail", { orderId: "100001" });

// Handle route match in detail controller
onRouteMatched: function(oEvent) {
  const sOrderId = oEvent.getParameter("arguments").orderId;
  this._bindView("/Orders/" + sOrderId);
},
```

---

## PART 3 — Reusable Components (Fragments)

```xml
<!-- Shared dialog fragment: ConfirmDialog.fragment.xml -->
<core:FragmentDefinition
  xmlns="sap.m"
  xmlns:core="sap.ui.core">
  
  <Dialog
    id="confirmDialog"
    title="{i18n>confirmTitle}"
    type="Message"
    icon="sap-icon://question-mark">
    
    <content>
      <Text text="{/confirmMessage}" />
    </content>
    
    <buttons>
      <Button
        text="{i18n>confirm}"
        type="Emphasized"
        press=".onConfirm" />
      <Button
        text="{i18n>cancel}"
        press=".onCancel" />
    </buttons>
  </Dialog>
  
</core:FragmentDefinition>
```

```javascript
// Use fragment in controller
onDeletePress: async function() {
  if (!this._oConfirmDialog) {
    this._oConfirmDialog = await Fragment.load({
      id: this.getView().getId(),
      name: "com.myapp.fragments.ConfirmDialog",
      controller: this,
    });
    this.getView().addDependent(this._oConfirmDialog);
  }
  
  this.getModel("viewModel").setProperty("/confirmMessage", 
    "Are you sure you want to delete this order?"
  );
  
  this._oConfirmDialog.open();
},

onConfirm: function() {
  this._oConfirmDialog.close();
  this._deleteOrder();
},
```

---

## PART 4 — Performance Optimization

### Lazy Loading Targets (Async Routing)
```json
"targets": {
  "detail": {
    "type": "XMLView",
    "name": "Detail",
    "async": true  // Load view asynchronously
  }
}
```

### Model Preprocessing
```javascript
// Don't fetch ALL fields — use $select and $expand
const oListBinding = this.byId("table").getBinding("items");

// OData v4 auto-$select: only request displayed properties
// Configured in manifest: "autoExpandSelect": true

// Manual $expand for related entities
const oBinding = oModel.bindList("/Orders", null, null, null, {
  $expand: "Items($select=ProductId,Quantity,Price)",
  $select: "OrderId,CustomerId,Status,TotalAmount,CreatedAt",
  $top: 50,
  $orderby: "CreatedAt desc",
});
```

### Table Performance
```xml
<!-- Use Growing Table with threshold -->
<Table
  id="ordersTable"
  growing="true"
  growingThreshold="25"
  growingScrollToLoad="true">
  <!-- Loads 25 rows, then 25 more on scroll — no virtualization needed -->
</Table>
```

---

## PART 5 — Accessibility (SAP Fiori Requirement)

```
SAP Fiori design enforces WCAG 2.1 AA out of the box:
- UI5 controls have built-in ARIA attributes
- Focus management handled by framework
- Color contrast meets WCAG AA
- Screen reader tested with JAWS and NVDA

Your job: Don't break it!
Common mistakes:
  ❌ Using custom HTML instead of UI5 controls (loses ARIA)
  ❌ Hiding elements with visibility:hidden instead of UI5's visible property
  ❌ Using DIV for clickable areas instead of Button control
  ❌ Not providing labels for form fields (use Label with labelFor)
```

---

## PART 6 — Internationalization (i18n)

```
SAP UI5 has built-in i18n support:

Folder: webapp/i18n/
  i18n.properties         ← Default (English)
  i18n_de.properties      ← German
  i18n_fr.properties      ← French
  i18n_zh_CN.properties   ← Chinese Simplified

i18n.properties:
  appTitle=Order Management
  deleteConfirm=Are you sure you want to delete this order?
  saveSuccess=Order saved successfully

In XML view:
  <Title text="{i18n>appTitle}" />

In controller:
  const sMessage = this.getModel("i18n")
    .getResourceBundle()
    .getText("deleteConfirm");
```

---

## PART 7 — Security in SAP UI5

```
CSRF Protection:
  SAP UI5 OData model handles CSRF token automatically
  - Fetches token with HEAD request before state-changing ops
  - Attaches X-CSRF-Token header to POST/PUT/DELETE requests
  
XSS Prevention:
  - Always use UI5 controls, not raw innerHTML
  - Text controls auto-escape HTML
  - If you MUST render HTML: use FormattedText control (sanitized)
  
Authorization:
  - Check OData service permissions (SAP backend handles this)
  - Hide sensitive UI elements based on user role
  - Never rely on frontend-only authorization
  
Example role check:
  const oUser = this.getModel("userInfo").getData();
  if (oUser.roles.includes("ADMIN")) {
    this.byId("deleteButton").setVisible(true);
  }
```

---

## 🎯 SAP UI5 Cheat Sheet

```
SAP UI5 = OData v4 + XML Views + Controllers + Fiori Design Guidelines

Key Patterns:
  OData binding     → Automatic CRUD via model.submitBatch()
  Fragments         → Reusable dialogs and popups
  $select/$expand   → Optimize what data you fetch
  i18n model        → All text in resource bundles (never hardcode)
  Router            → Declarative in manifest.json, navTo() in code
  Growing table     → Built-in pagination (growingThreshold: 25)

Performance:
  autoExpandSelect: true    → Only fetch displayed fields
  async: true in targets    → Lazy load views
  batch groups              → Combine multiple reads into one HTTP call

Don't Do:
  ❌ Direct DOM manipulation (document.getElementById)
  ❌ Raw HTML in views (use UI5 controls)
  ❌ localStorage for user data (use user preferences API)
  ❌ Hardcoded text (use i18n)
  ❌ Frontend-only authorization (backend must validate too)
  
Key UI5 Controls to Know:
  sap.m.List / sap.m.Table → Lists and tables
  sap.m.Dialog             → Modals
  sap.m.Page               → Page with toolbar
  sap.f.DynamicPage        → Collapsing header page
  sap.m.FlexBox            → Flexbox layout
  sap.ui.layout.form.Form  → Form layout
  sap.m.MessageBox         → Alerts/Confirms
  sap.m.MessageToast       → Toast notifications
```
