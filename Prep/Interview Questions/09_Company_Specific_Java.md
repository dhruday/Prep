# 09 — Company-Specific, Enterprise & Java/Spring

> **Scope:** Web Components, LWC/Salesforce, SAP UI5, Enterprise Patterns, OOP, SOLID, Design Patterns, Clean Code, Java/Spring Internals  
> **Topics:** FE 357–387 + BE 168–213 (~77 topics)  
> **Format:** Q&A with follow-ups, trade-offs, code examples

---

## Table of Contents

### Frontend — Web Components & Enterprise
- [Part A — Web Components Fundamentals (357–360)](#part-a--web-components-fundamentals-topics-357360)
- [Part B — Lightning Web Components (361–365)](#part-b--lightning-web-components-topics-361365)
- [Part C — Framework Interop (366–368)](#part-c--framework-interop-topics-366368)
- [Part D — SAP UI5 Architecture (369–372)](#part-d--sap-ui5-architecture-topics-369372)
- [Part E — Fiori Design System (373–375)](#part-e--fiori-design-system-topics-373375)
- [Part F — Enterprise UI Patterns (376–379)](#part-f--enterprise-ui-patterns-topics-376379)
- [Part G — Positioning SAP Experience (380–382)](#part-g--positioning-sap-experience-topics-380382)
- [Part H — System Design Foundations (383–387)](#part-h--system-design-foundations-topics-383387)

### Backend — OOP, Design Patterns, Java/Spring
- [Part I — OOP & SOLID (168–178)](#part-i--oop--solid-topics-168178)
- [Part J — Creational Patterns (179–182)](#part-j--creational-patterns-topics-179182)
- [Part K — Structural Patterns (183–186)](#part-k--structural-patterns-topics-183186)
- [Part L — Behavioral Patterns (187–191)](#part-l--behavioral-patterns-topics-187191)
- [Part M — Pattern Selection & Anti-Patterns (192–193)](#part-m--pattern-selection--anti-patterns-topics-192193)
- [Part N — Clean Code & Engineering (194–202)](#part-n--clean-code--engineering-topics-194202)
- [Part O — Java & Spring Internals (203–213)](#part-o--java--spring-internals-topics-203213)

---

# Part A — Web Components Fundamentals (Topics 357–360)

---

## 357. Custom Elements API

### Q: What are Custom Elements and how do you create one?

**Answer (Interview-Ready):**

Custom Elements let you define new HTML tags with encapsulated behavior.

```js
class MyButton extends HTMLElement {
  static observedAttributes = ['variant', 'disabled'];
  
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    // Called when element is added to DOM
    this.render();
  }
  
  disconnectedCallback() {
    // Cleanup: remove listeners, cancel timers
  }
  
  attributeChangedCallback(name, oldVal, newVal) {
    // Called when observed attribute changes
    this.render();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>button { padding: 8px 16px; }</style>
      <button><slot></slot></button>
    `;
  }
}

customElements.define('my-button', MyButton);
// Usage: <my-button variant="primary">Click me</my-button>
```

**Lifecycle:**
| Callback | When |
|----------|------|
| `constructor()` | Element created (don't access attributes/children) |
| `connectedCallback()` | Added to DOM — setup here |
| `disconnectedCallback()` | Removed from DOM — cleanup here |
| `attributeChangedCallback()` | Observed attribute changes |
| `adoptedCallback()` | Moved to new document (rare) |

🔥 **Most Asked**: Lifecycle order, observedAttributes, when to use vs React/Angular
🧠 **Strategy**: "Custom Elements = native component model. Framework-agnostic. connectedCallback for setup, disconnectedCallback for cleanup"

---

## 358. Shadow DOM — Open vs Closed Mode

### Q: What is Shadow DOM and what's the difference between open and closed mode?

**Answer (Interview-Ready):**

Shadow DOM provides **style and DOM encapsulation** — styles inside don't leak out, styles outside don't leak in.

```js
// Open: external JS can access shadowRoot
this.attachShadow({ mode: 'open' });
// el.shadowRoot → accessible

// Closed: external JS cannot access shadowRoot
this.attachShadow({ mode: 'closed' });
// el.shadowRoot → null
```

| | Open | Closed |
|-|------|--------|
| `el.shadowRoot` | Returns shadow root | Returns `null` |
| Style encapsulation | ✅ Yes | ✅ Yes |
| External JS access | ✅ Yes | ❌ No |
| DevTools access | ✅ Yes | ✅ Yes |
| Use case | Most components | Security-sensitive (rare) |

**CSS piercing:**
- `::part()` — style exposed parts from outside
- CSS custom properties (`--my-color`) pass through shadow boundary

```css
/* Outside: style a part exposed by the component */
my-button::part(label) { color: red; }

/* Inside component: use CSS variable from outside */
button { color: var(--button-color, blue); }
```

🔥 **Most Asked**: Open vs closed, style encapsulation, CSS piercing
🧠 **Strategy**: "Open for most cases. Shadow DOM encapsulates styles. Use ::part() and CSS vars for theming"

---

## 359. HTML Templates & Slots

### Q: How do `<template>`, `<slot>`, and named slots work in Web Components?

**Answer (Interview-Ready):**

```html
<!-- Define a reusable template -->
<template id="card-template">
  <style>
    .card { border: 1px solid #ccc; padding: 16px; }
    .header { font-weight: bold; }
  </style>
  <div class="card">
    <div class="header"><slot name="title">Default Title</slot></div>
    <div class="body"><slot>Default content</slot></div>
    <div class="footer"><slot name="actions"></slot></div>
  </div>
</template>

<!-- Usage -->
<my-card>
  <span slot="title">Product Details</span>
  <p>This is the main content (goes to default slot)</p>
  <button slot="actions">Buy Now</button>
</my-card>
```

```js
class MyCard extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const template = document.getElementById('card-template');
    shadow.appendChild(template.content.cloneNode(true));
  }
}
customElements.define('my-card', MyCard);
```

**Key concepts:**
- `<template>` — parsed but not rendered until cloned
- Default `<slot>` — catches un-slotted children
- Named `<slot name="x">` — matches `slot="x"` attribute
- Fallback content inside `<slot>` shows when no content provided

🔥 **Most Asked**: Named slots, fallback content, template cloning
🧠 **Strategy**: "Template for reusable markup. Slots for content projection. Named slots for specific placement"

---

## 360. Custom Events & Component Communication

### Q: How do Web Components communicate with each other?

**Answer (Interview-Ready):**

**Parent → Child:** Attributes/properties
```js
// Set via attribute
document.querySelector('my-child').setAttribute('name', 'Hruday');
// Set via property (richer types)
document.querySelector('my-child').data = { id: 1, name: 'Hruday' };
```

**Child → Parent:** Custom Events
```js
// Inside child component
this.dispatchEvent(new CustomEvent('item-selected', {
  detail: { id: 42, name: 'Product' },
  bubbles: true,    // Propagates up the DOM
  composed: true,   // Crosses shadow DOM boundary
}));

// Parent listens
document.querySelector('my-child').addEventListener('item-selected', (e) => {
  console.log(e.detail);  // { id: 42, name: 'Product' }
});
```

**Sibling communication:** Event bus or shared state store.

| Pattern | Direction | Mechanism |
|---------|-----------|-----------|
| Attributes/props | Parent → Child | `setAttribute()` / property |
| Custom Events | Child → Parent | `dispatchEvent()` + `composed: true` |
| Event Bus | Any → Any | Pub/sub on shared object |
| Shared Store | Any → Any | External state (Redux-like) |

🔥 **Most Asked**: `composed: true` for shadow boundary, Custom Events, attribute vs property
🧠 **Strategy**: "Props down, events up — same as React/Angular. composed:true crosses Shadow DOM. Event bus for siblings"

---

# Part B — Lightning Web Components (Topics 361–365)

---

## 361. LWC Component Lifecycle

### Q: Explain the Lightning Web Component lifecycle hooks.

**Answer (Interview-Ready):**

```js
import { LightningElement, api } from 'lwc';

export default class MyComponent extends LightningElement {
  // 1. constructor() — component created, no DOM access
  constructor() {
    super();
  }
  
  // 2. connectedCallback() — component inserted into DOM
  connectedCallback() {
    // Fetch data, subscribe to events
    this.loadData();
  }
  
  // 3. renderedCallback() — after every render (use carefully)
  renderedCallback() {
    // DOM access available here
    // Guard against infinite loops: check if already initialized
    if (this._initialized) return;
    this._initialized = true;
    this.setupChart();
  }
  
  // 4. disconnectedCallback() — removed from DOM
  disconnectedCallback() {
    // Unsubscribe, cleanup
  }
  
  // 5. errorCallback(error, stack) — catches child errors
  errorCallback(error, stack) {
    this.error = error;
  }
}
```

| Hook | When | Use For |
|------|------|---------|
| `constructor` | Instance created | Initialize properties |
| `connectedCallback` | Added to DOM | Data fetch, subscriptions |
| `renderedCallback` | After each render | DOM manipulation (guarded) |
| `disconnectedCallback` | Removed from DOM | Cleanup |
| `errorCallback` | Child component error | Error boundary |

🔥 **Most Asked**: Lifecycle order, renderedCallback guard, vs React hooks
🧠 **Strategy**: "Similar to Web Components lifecycle. renderedCallback needs guard to prevent infinite loops. errorCallback = error boundary"

---

## 362. @api, @track, @wire Decorators

### Q: Explain LWC's three reactive decorators.

**Answer (Interview-Ready):**

```js
import { LightningElement, api, track, wire } from 'lwc';
import getContacts from '@salesforce/apex/ContactController.getContacts';

export default class ContactList extends LightningElement {
  // @api — Public property (parent sets it)
  @api recordId;
  
  // @track — Deep reactive tracking (objects/arrays)
  // Note: since Spring '20, primitive reactivity is automatic
  @track filters = { status: 'active', page: 1 };
  
  // @wire — Reactive data provisioning from Apex/adapters
  @wire(getContacts, { accountId: '$recordId' })
  contacts;  // { data, error } — auto-refreshes when recordId changes
}
```

| Decorator | Purpose | Reactivity |
|-----------|---------|------------|
| `@api` | Public prop (parent → child) | Re-renders on change |
| `@track` | Deep tracking for objects/arrays | Re-renders on nested change |
| `@wire` | Declarative data fetching | Auto-calls when reactive param (`$`) changes |

**`$recordId` in @wire:** The `$` prefix means "watch this property reactively" — when `recordId` changes, the wire re-fetches.

🔥 **Most Asked**: @api vs @track vs @wire, $ reactive binding, when to use each
🧠 **Strategy**: "@api for public. @track for deep objects. @wire for declarative data fetching with reactive params"

---

## 363. Wire Service & Apex Method Integration

### Q: How does the Wire Service connect LWC to Salesforce data?

**Answer (Interview-Ready):**

```js
// Declarative (reactive) — @wire
import { wire } from 'lwc';
import getAccounts from '@salesforce/apex/AccountController.getAccounts';

export default class AccountList extends LightningElement {
  @wire(getAccounts, { filter: '$searchTerm' })
  wiredAccounts({ data, error }) {
    if (data) this.accounts = data;
    if (error) this.error = error;
  }
}

// Imperative (on-demand) — for user-triggered actions
import createAccount from '@salesforce/apex/AccountController.createAccount';

async handleCreate() {
  try {
    const result = await createAccount({ name: this.accountName });
    this.showToast('Success', 'Account created');
  } catch (error) {
    this.showToast('Error', error.body.message);
  }
}
```

| Approach | When | Caching |
|----------|------|---------|
| `@wire` | Read data reactively | Cached by default |
| Imperative | User actions (create/update/delete) | Not cached |

**Lightning Data Service (LDS):** Built-in adapters (`getRecord`, `updateRecord`) — no Apex needed for simple CRUD.

🔥 **Most Asked**: @wire vs imperative, LDS vs custom Apex, caching behavior
🧠 **Strategy**: "@wire for reads (cached, reactive). Imperative for writes. LDS for simple CRUD without Apex"

---

## 364. LWC Events — Custom Events, Lightning Message Service

### Q: How do LWC components communicate?

**Answer (Interview-Ready):**

| Pattern | Direction | Mechanism |
|---------|-----------|-----------|
| `@api` property | Parent → Child | Prop binding |
| Custom Event | Child → Parent | `CustomEvent` + `dispatchEvent` |
| LMS (Lightning Message Service) | Any → Any | Pub/sub across DOM hierarchy |
| `pubsub` module | Any → Any (legacy) | Custom event bus |

```js
// Child → Parent: Custom Event
this.dispatchEvent(new CustomEvent('select', {
  detail: { recordId: this.record.Id },
  bubbles: false,  // LWC best practice: don't bubble
}));

// Parent:
// <c-child onselect={handleSelect}></c-child>

// LMS: Cross-component communication
import { publish, subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED from '@salesforce/messageChannel/RecordSelected__c';

@wire(MessageContext) messageContext;

handleSelect(event) {
  publish(this.messageContext, RECORD_SELECTED, { recordId: event.detail.recordId });
}
```

🔥 **Most Asked**: Custom events vs LMS, when to use each, bubbling in LWC
🧠 **Strategy**: "Props down, events up for parent-child. LMS for unrelated components. Don't bubble custom events in LWC"

---

## 365. Salesforce Lightning Design System (SLDS)

### Q: What is SLDS and how is it used in LWC?

**Answer (Interview-Ready):**

**SLDS = Salesforce's design system** — CSS framework + design tokens + component blueprints for consistent Salesforce UIs.

```html
<template>
  <lightning-card title="Contacts">
    <div class="slds-p-around_medium">
      <lightning-datatable
        key-field="id"
        data={contacts}
        columns={columns}>
      </lightning-datatable>
    </div>
  </lightning-card>
</template>
```

**Key concepts:**
- **Base components:** `lightning-button`, `lightning-datatable`, `lightning-card` — SLDS-styled out of the box
- **Utility classes:** `slds-p-around_medium`, `slds-grid`, `slds-col` — spacing, layout
- **Design tokens:** `--lwc-colorBrand` — themeable CSS vars
- **Responsive grid:** 12-column grid system

**Why it matters in interviews:** Shows you can work within design system constraints, understand token-based theming, and build consistent enterprise UIs.

🔥 **Most Asked**: Base components vs custom HTML, SLDS utility classes, design tokens
🧠 **Strategy**: "Use base lightning components first. SLDS utilities for layout. Design tokens for theming"

---

# Part C — Framework Interop (Topics 366–368)

---

## 366. Angular Elements — Exporting as Web Components

### Q: How do you export an Angular component as a Web Component?

**Answer (Interview-Ready):**

```ts
// 1. Create Angular component
@Component({
  selector: 'app-widget',
  template: `<div class="widget">{{title}}</div>`,
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class WidgetComponent {
  @Input() title = 'Hello';
}

// 2. Register as Custom Element in AppModule
import { createCustomElement } from '@angular/elements';

export class AppModule {
  constructor(private injector: Injector) {}
  
  ngDoBootstrap() {
    const el = createCustomElement(WidgetComponent, { injector: this.injector });
    customElements.define('angular-widget', el);
  }
}

// 3. Use anywhere:
// <angular-widget title="Dashboard"></angular-widget>
```

**Use cases:** Embed Angular widgets in non-Angular pages, micro-frontends, gradual migration.

**Bundle size concern:** Each Angular Element carries Angular runtime (~100KB+ gzipped). Use for substantial widgets, not tiny components.

🔥 **Most Asked**: Bundle size overhead, use cases, ViewEncapsulation with Shadow DOM
🧠 **Strategy**: "Angular Elements wraps components as Custom Elements. Carries Angular runtime. Best for substantial widgets in micro-frontends"

---

## 367. Embedding React in Angular & Vice Versa

### Q: How do you embed a React component inside an Angular application?

**Answer (Interview-Ready):**

```ts
// Angular wrapper for React component
@Component({
  selector: 'react-wrapper',
  template: '<div #reactRoot></div>',
})
export class ReactWrapperComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('reactRoot', { static: true }) rootEl!: ElementRef;
  @Input() data: any;

  private root!: Root;

  ngOnInit() {
    this.root = createRoot(this.rootEl.nativeElement);
    this.renderReact();
  }

  ngOnChanges() {
    this.renderReact();
  }

  ngOnDestroy() {
    this.root.unmount();
  }

  private renderReact() {
    this.root.render(React.createElement(MyReactComponent, { data: this.data }));
  }
}
```

**Challenges:**
| Issue | Solution |
|-------|----------|
| State sharing | Shared event bus or external store (Zustand, custom) |
| Routing | Single router owns URL; nested app uses memory router |
| Styling conflicts | CSS Modules, Shadow DOM, or namespaced classes |
| Bundle size | Each framework adds its runtime |

🔥 **Most Asked**: State sharing, routing conflicts, when to use this approach
🧠 **Strategy**: "Wrapper component renders React inside Angular div. Key challenges: state sharing, routing, CSS conflicts. Use for migration"

---

## 368. Sharing State Across Frameworks in Micro-Frontends

### Q: How do you share state between micro-frontends built with different frameworks?

**Answer (Interview-Ready):**

| Approach | Pros | Cons |
|----------|------|------|
| **Custom Events** | Simple, native, no deps | No persistence, string data |
| **Shared observable store** | Reactive, framework-agnostic | Shared dependency |
| **URL/query params** | Universal, bookmarkable | Limited data size |
| **Browser storage** | Persistent, cross-tab | Not reactive (need StorageEvent) |

```ts
// Shared observable store (framework-agnostic)
// shared-store.ts — loaded once, shared via import map
class SharedStore {
  private listeners = new Map<string, Set<Function>>();
  private state: Record<string, unknown> = {};
  
  get(key: string) { return this.state[key]; }
  
  set(key: string, value: unknown) {
    this.state[key] = value;
    this.listeners.get(key)?.forEach(fn => fn(value));
  }
  
  subscribe(key: string, fn: Function) {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(fn);
    return () => this.listeners.get(key)!.delete(fn);
  }
}

// React micro-frontend
function useSharedState(key) {
  const [val, setVal] = useState(sharedStore.get(key));
  useEffect(() => sharedStore.subscribe(key, setVal), [key]);
  return val;
}

// Angular micro-frontend
sharedStore.subscribe('user', (user) => this.ngZone.run(() => this.user = user));
```

🔥 **Most Asked**: Custom events vs shared store, Module Federation for state, reactivity
🧠 **Strategy**: "Custom events for simple signals. Shared observable store for state. Import maps for shared dependency. Keep shared surface minimal"

---

# Part D — SAP UI5 Architecture (Topics 369–372)

---

## 369. SAPUI5 vs OpenUI5 — Differences & Licensing

### Q: What are the differences between SAPUI5 and OpenUI5?

**Answer (Interview-Ready):**

| Aspect | SAPUI5 | OpenUI5 |
|--------|--------|---------|
| Licensing | Commercial (SAP) | Open source (Apache 2.0) |
| Controls | Full library (charting, smart controls) | Core controls only |
| Support | SAP enterprise support | Community |
| Deployment | SAP BTP, ABAP server | Any web server |
| Themes | All SAP themes | Subset |

**Both share:** Same core framework, MVC pattern, OData model support, XML views.

**When to use OpenUI5:** POCs, non-SAP projects that need similar UX, community contributions.

🔥 **Most Asked**: Licensing, control differences, when to recommend each
🧠 **Strategy**: "Same core. SAPUI5 adds smart controls + enterprise support. OpenUI5 for open-source/non-SAP"

---

## 370. MVC Pattern in UI5

### Q: How does the MVC pattern work in SAP UI5?

**Answer (Interview-Ready):**

```xml
<!-- View (XML) -->
<mvc:View controllerName="my.app.controller.Main" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m">
  <Page title="{/title}">
    <List items="{/products}">
      <StandardListItem title="{name}" description="{price}" press="onItemPress" />
    </List>
  </Page>
</mvc:View>
```

```js
// Controller
sap.ui.define(["sap/ui/core/mvc/Controller"], function(Controller) {
  return Controller.extend("my.app.controller.Main", {
    onInit: function() {
      var oModel = new sap.ui.model.json.JSONModel({ 
        title: "Products", 
        products: [] 
      });
      this.getView().setModel(oModel);
      this.loadProducts();
    },
    onItemPress: function(oEvent) {
      var oItem = oEvent.getSource().getBindingContext().getObject();
      // Navigate to detail
    }
  });
});
```

```js
// Model types
JSONModel    // Client-side, for small datasets
ODataModel   // Server-side, for SAP backend (v2 or v4)
ResourceModel // i18n translations
```

🔥 **Most Asked**: XML views vs JS views, model types, data binding syntax
🧠 **Strategy**: "XML Views preferred (declarative). JSONModel for client data, ODataModel for backend. {/path} for one-way binding"

---

## 371. OData Binding — Property, Aggregation, Element Binding

### Q: Explain the three types of data binding in UI5.

**Answer (Interview-Ready):**

```xml
<!-- 1. Property Binding: bind a single property -->
<Text text="{/company/name}" />
<!-- Binds to model path /company/name -->

<!-- 2. Aggregation Binding: bind a list/collection -->
<List items="{/orders}">
  <StandardListItem title="{orderNumber}" description="{status}" />
</List>
<!-- Repeats template for each item in /orders array -->

<!-- 3. Element Binding: bind entire element to context -->
<Panel id="detailPanel">
  <!-- After: oPanel.bindElement("/orders/3") -->
  <Text text="{orderNumber}" />  <!-- Resolves to /orders/3/orderNumber -->
</Panel>
```

| Type | Purpose | Syntax |
|------|---------|--------|
| Property | Single value | `text="{/path}"` |
| Aggregation | List/collection | `items="{/array}"` + template |
| Element | Set context for children | `bindElement("/path")` |

**Binding modes:** OneWay (default), TwoWay (input fields), OneTime (static).

🔥 **Most Asked**: Three binding types, OData v2 vs v4, binding modes
🧠 **Strategy**: "Property for values, aggregation for lists, element for context. OData v4 adds batch improvements and $filter"

---

## 372. UI5 Lifecycle — init, onBeforeRendering, onAfterRendering

### Q: Describe the UI5 control lifecycle hooks.

**Answer (Interview-Ready):**

```js
sap.ui.define(["sap/ui/core/Control"], function(Control) {
  return Control.extend("my.CustomControl", {
    
    init: function() {
      // Called once when control is instantiated
      // Initialize internal state
    },
    
    onBeforeRendering: function() {
      // Called before every render (initial + re-render)
      // Detach DOM event listeners
    },
    
    renderer: function(oRm, oControl) {
      // RenderManager writes HTML
      oRm.openStart("div", oControl);
      oRm.class("myControl");
      oRm.openEnd();
      oRm.text(oControl.getText());
      oRm.close("div");
    },
    
    onAfterRendering: function() {
      // Called after every render
      // Attach DOM event listeners, jQuery plugins
      this.$().on("click", this._onClick.bind(this));
    },
    
    exit: function() {
      // Called when control is destroyed
      // Cleanup: detach listeners, destroy child controls
    }
  });
});
```

| Hook | When | Purpose |
|------|------|---------|
| `init` | Once, on creation | Setup state |
| `onBeforeRendering` | Before each render | Detach DOM handlers |
| `renderer` | Generates HTML | Write DOM |
| `onAfterRendering` | After each render | Attach DOM handlers |
| `exit` | On destroy | Cleanup |

🔥 **Most Asked**: Lifecycle order, onAfterRendering for DOM access, renderer pattern
🧠 **Strategy**: "init → onBeforeRendering → render → onAfterRendering → exit. DOM access only in onAfterRendering"

---

# Part E — Fiori Design System (Topics 373–375)

---

## 373. SAP Fiori Design Principles

### Q: What are the core SAP Fiori design principles?

**Answer (Interview-Ready):**

**5 Fiori Principles:**

| Principle | Meaning |
|-----------|---------|
| **Role-based** | Show only what's relevant to the user's role |
| **Adaptive** | Works across devices (desktop, tablet, mobile) |
| **Simple** | Reduce complexity; 1-1-3 rule (1 user, 1 use case, 3 screens max) |
| **Coherent** | Consistent look and behavior across all apps |
| **Delightful** | Fast, responsive, intuitive interactions |

**Fiori App Types:**
- **Transactional:** Create/edit/delete business objects (Create Sales Order)
- **Analytical:** Charts, KPIs, drill-down (Sales Dashboard)
- **Factsheet:** Read-only detail view (Customer 360)

**Interview relevance:** Shows understanding of enterprise UX constraints — not just "make it pretty" but "make it role-appropriate and consistent across 500+ apps."

🔥 **Most Asked**: 5 principles, app types, how Fiori differs from consumer design
🧠 **Strategy**: "Role-based, adaptive, simple, coherent, delightful. Enterprise UX = consistency at scale over novelty"

---

## 374. Fiori Launchpad Architecture

### Q: How does SAP Fiori Launchpad work architecturally?

**Answer (Interview-Ready):**

```
┌─────────────────────────────────────────────────┐
│               Fiori Launchpad (FLP)              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │ Tile │ │ Tile │ │ Tile │ │ Tile │  ← Role-based │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘           │
│     │        │        │        │                │
│  Navigation Target Resolution (Intent-Based)    │
│     │        │        │        │                │
│  ┌──▼───┐ ┌──▼───┐ ┌──▼───┐ ┌──▼───┐           │
│  │App 1 │ │App 2 │ │App 3 │ │App 4 │  ← Loaded on demand │
│  └──────┘ └──────┘ └──────┘ └──────┘           │
└─────────────────────────────────────────────────┘
```

**Key concepts:**
- **Tiles:** Entry points to apps (static, dynamic with KPIs, news)
- **Intent-based navigation:** `#SemanticObject-action?params` → resolves to app
- **Target mapping:** Maps intents to component URLs
- **Shell services:** Personalization, navigation, cross-app state
- **Plugin model:** Extend FLP with custom plugins (support chat, analytics)

🔥 **Most Asked**: Intent-based navigation, tile types, how apps are loaded
🧠 **Strategy**: "FLP is the enterprise app container. Intent-based navigation decouples tiles from apps. Apps loaded on demand"

---

## 375. Theming — SAP Theming Base Content, CSS Variables

### Q: How does theming work in SAP UI5 and Fiori?

**Answer (Interview-Ready):**

```js
// Set theme programmatically
sap.ui.getCore().applyTheme("sap_horizon");

// Available themes:
// sap_horizon       → Modern (default since 2022)
// sap_horizon_dark  → Dark mode
// sap_fiori_3       → Fiori 3 (older)
// sap_belize        → Legacy
```

**Theming architecture:**
- **Theme Designer:** GUI tool for custom themes (generate `.css`)
- **LESS variables / CSS Custom Properties:** `--sapBrandColor`, `--sapContent_ForegroundColor`
- **Theme at runtime:** CSS file swapped, no JS reload

```css
/* Use SAP theme parameters in custom CSS */
.myClass {
  color: var(--sapContent_ForegroundColor);
  background: var(--sapBackgroundColor);
  border: 1px solid var(--sapGroup_ContentBorderColor);
}
```

🔥 **Most Asked**: Theme switching mechanism, CSS variables, custom theming
🧠 **Strategy**: "Theme = CSS file swap. Use SAP CSS variables for custom controls. Theme Designer for enterprise branding"

---

# Part F — Enterprise UI Patterns (Topics 376–379)

---

## 376–379. Master-Detail, Worklist, Object Page, Smart Controls

### Q: Explain the core Fiori enterprise UI patterns.

**Answer (Interview-Ready):**

**376 — Master-Detail:**
```
┌──────────────┬────────────────────────┐
│ Master List  │   Detail View          │
│ ─────────── │   Customer: Acme Corp  │
│ ▶ Acme Corp │   Revenue: $1.2M       │
│   Globex    │   Contacts: 12         │
│   Initech   │   Orders: [table]      │
└──────────────┴────────────────────────┘
```
- Split-screen: list on left, detail on right
- Responsive: full-screen list on mobile → drill to detail

**377 — Worklist:**
- Table/list of items to process (Approve POs, Review Invoices)
- Filters, sorting, grouping, inline actions
- Status indicators (pending, approved, rejected)

**378 — Object Page:**
```
┌──────────────────────────────────────┐
│ Header: Title, KPIs, Actions         │
├──────────────────────────────────────┤
│ Anchor Bar: [General] [Contacts] ... │
├──────────────────────────────────────┤
│ Section: General Information         │
│ Subsection: Address, Communication   │
│                                      │
│ Section: Related Contacts            │
│ [Responsive Table]                   │
└──────────────────────────────────────┘
```
- Scrollable page with anchored sections
- Sticky header with KPIs and actions
- Sections load lazily

**379 — Smart Controls:**
```xml
<!-- SmartTable: auto-generates columns from OData metadata -->
<smartTable:SmartTable
  entitySet="Products"
  tableType="ResponsiveTable"
  useVariantManagement="true"
  useTablePersonalisation="true">
</smartTable:SmartTable>

<!-- SmartFilterBar: auto-generates filters from annotations -->
<smartFilterBar:SmartFilterBar entitySet="Products" />
```

Smart controls read OData `$metadata` and annotations → auto-generate UI. Reduces boilerplate by 60-80%.

🔥 **Most Asked**: Master-Detail responsive behavior, Object Page structure, Smart Controls value
🧠 **Strategy**: "Fiori patterns are standardized. Master-Detail for browse+edit. Object Page for entity detail. Smart Controls auto-generate from metadata"

---

# Part G — Positioning SAP Experience (Topics 380–382)

---

## 380–382. Articulating SAP Experience, Transferable Skills, Case Study

### Q: How do you position SAP UI5 experience for non-SAP companies like Microsoft or Google?

**Answer (Interview-Ready):**

**380 — Articulating SAP Work:**

| SAP Term | Universal Translation |
|----------|----------------------|
| OData Service | REST API with pagination, filtering |
| Fiori Launchpad | Micro-frontend shell / app container |
| Smart Controls | Metadata-driven UI generation |
| ABAP backend | Enterprise Java/Node.js backend |
| BSP/Fiori deployment | CI/CD pipeline + CDN deployment |
| UI5 XML Views | Declarative component templates |

**Don't say:** "I worked with SAP UI5 and OData bindings"  
**Say:** "I built enterprise applications with a component-based MVC framework, consuming REST APIs with real-time data binding, implementing design system patterns, and optimizing for 500+ concurrent users"

**381 — Transferable Skills:**
- **OData → REST/GraphQL:** Both are API consumption patterns with filtering, pagination, and batch operations
- **UI5 MVC → React/Angular:** Component lifecycle, state management, data binding concepts are universal
- **Fiori Design System → Any design system:** Token-based theming, component library governance, accessibility compliance
- **Enterprise scale:** Performance at scale, internationalization, role-based access, offline support

**382 — SAP BI Launchpad Case Study:**
"I optimized SAP BI Launchpad performance by implementing lazy loading for dashboard tiles (40% faster initial load), adding virtual scrolling for report lists with 10K+ items, implementing CDN caching with aggressive cache headers, and resolving accessibility gaps to achieve WCAG 2.1 AA compliance — all transferable patterns I'd apply to any large-scale web application."

🔥 **Most Asked**: How SAP experience translates, what transferable skills to highlight
🧠 **Strategy**: "Translate SAP terminology to universal concepts. Focus on scale, design systems, API patterns, and performance — not SAP-specific tools"

---

# Part H — System Design Foundations (Topics 383–387)

---

## 383. What is Frontend System Design?

### Q: What is frontend system design and why does it matter?

**Answer (Interview-Ready):**
Frontend system design = designing the **architecture, component structure, data flow, and non-functional requirements** of a frontend application at scale.

| Backend Design | Frontend Design |
|----------------|-----------------|
| DB schema, APIs, scaling | Component architecture, state, rendering |
| Throughput, latency | LCP, INP, CLS |
| Horizontal scaling | Code splitting, CDN, caching |
| CAP theorem | Offline-first, optimistic UI |

**What you design:**
1. Component hierarchy and composition
2. State management strategy
3. Data fetching and caching
4. Routing and navigation
5. Performance budget and optimization
6. Error handling and resilience

🔥 **Most Asked**: How it differs from backend, what to cover in 45 minutes
🧠 **Strategy**: "Start with requirements → component tree → state/data flow → API design → performance → edge cases"

---

## 384. How Frontend System Design Differs from Backend

### Q: What makes frontend system design unique?

(Covered in depth with Topic 383. Key additions:)

**Frontend-specific concerns:**
- User interaction latency (< 100ms for input response)
- Device diversity (mobile 3G → desktop fiber)
- Browser constraints (single-threaded, memory limits)
- Offline/slow network handling
- Accessibility (WCAG compliance)
- SEO (SSR/SSG for public pages)

---

## 385. Role of a Senior / Staff Frontend Engineer

### Q: What is expected of a senior/staff frontend engineer in system design?

**Answer (Interview-Ready):**

| Level | Expectation |
|-------|-------------|
| **Mid** | Implement designs, write clean components |
| **Senior** | Design the system, make architectural decisions, mentor |
| **Staff** | Cross-team architecture, set technical direction, influence org |

**Senior in interviews:**
- Drive the design conversation (don't wait for prompts)
- Identify trade-offs unprompted
- Consider non-functional requirements without being asked
- Propose monitoring and observability
- Articulate "why" behind every decision

🔥 **Most Asked**: Senior vs staff expectations, how to demonstrate seniority
🧠 **Strategy**: "Seniors drive. Identify trade-offs unprompted. Cover NFRs. Propose monitoring. Articulate 'why'"

---

## 386–387. Company Expectations & What FAANG Looks For

### Q: How do interview expectations differ across Microsoft, Adobe, Salesforce, Cisco, and Google?

**Answer (Interview-Ready):**

| Company | Focus Areas | Style |
|---------|------------|-------|
| **Microsoft** | System design depth, accessibility, Teams/O365 scale | Structured, collaborative |
| **Adobe** | Creative tools, performance, rich media, design systems | Innovation + engineering |
| **Salesforce** | LWC, enterprise patterns, multi-tenant, extensibility | Platform knowledge valued |
| **Cisco** | Real-time (WebRTC), dashboards, network visualization | Reliability + performance |
| **Google** | Algorithms + system design, scale, web platform depth | Bar highest, clean code |

**Universal FAANG expectations:**
1. Clarify requirements before designing
2. Think out loud — show reasoning process
3. Trade-offs > perfect answers
4. Cover non-functional: performance, accessibility, security
5. Consider scale: what changes at 10x, 100x users?
6. Test your design: "How would I verify this works?"

🔥 **Most Asked**: Company-specific differences, what separates accept from strong accept
🧠 **Strategy**: "Research the company's products. Frame answers using their domain. 'At Microsoft scale...' or 'In Salesforce multi-tenant...'"

---

# Part I — OOP & SOLID (Topics 168–178)

---

## 168. Object-Oriented Design Basics

### Q: Explain the four pillars of OOP with examples.

**Answer (Interview-Ready):**

| Pillar | Definition | Example |
|--------|-----------|---------|
| **Encapsulation** | Hide internal state behind methods | `private balance; public deposit(amount)` |
| **Abstraction** | Expose only relevant details | `interface PaymentGateway { charge(amount) }` |
| **Inheritance** | Share behavior via class hierarchy | `class Dog extends Animal` |
| **Polymorphism** | Same interface, different behavior | `shape.area()` works for Circle and Rectangle |

```java
// Polymorphism in action
interface Shape {
    double area();
}

class Circle implements Shape {
    private double radius;
    public double area() { return Math.PI * radius * radius; }
}

class Rectangle implements Shape {
    private double width, height;
    public double area() { return width * height; }
}

// Client code doesn't care which shape
double totalArea = shapes.stream().mapToDouble(Shape::area).sum();
```

🔥 **Most Asked**: Polymorphism examples, encapsulation benefits, abstraction vs encapsulation
🧠 **Strategy**: "Encapsulation = hide data. Abstraction = hide complexity. Inheritance = share behavior. Polymorphism = same interface, different implementation"

---

## 169. SOLID Principles (Overview)

### Q: What are the SOLID principles and why do they matter?

**Answer (Interview-Ready):**

| Principle | One-Liner |
|-----------|-----------|
| **S** — Single Responsibility | A class should have one reason to change |
| **O** — Open/Closed | Open for extension, closed for modification |
| **L** — Liskov Substitution | Subtypes must be substitutable for base types |
| **I** — Interface Segregation | Don't force clients to depend on unused methods |
| **D** — Dependency Inversion | Depend on abstractions, not concretions |

**Why they matter:** Reduce coupling → easier testing → safer refactoring → cheaper maintenance.

**When NOT to apply:** Early prototypes, small scripts, over-engineering simple CRUD apps.

🔥 **Most Asked**: Name all 5, give examples of each, when to NOT apply
🧠 **Strategy**: "SOLID reduces coupling. Each letter = one axis of flexibility. Don't over-apply for simple code"

---

## 170–174. SOLID Deep Dive (SRP, OCP, LSP, ISP, DIP)

### Q: Walk through each SOLID principle with a code example.

**Answer (Interview-Ready):**

**170 — SRP (Single Responsibility):**
```java
// Bad: class does reporting AND formatting
class Report {
    String generate() { /* query data + build report */ }
    void exportPdf() { /* format as PDF */ }
    void sendEmail() { /* email the report */ }
}

// Good: separate responsibilities
class ReportGenerator { String generate() { ... } }
class PdfExporter { void export(String report) { ... } }
class EmailSender { void send(String to, String content) { ... } }
```

**171 — OCP (Open/Closed):**
```java
// Open for extension via new implementations
interface DiscountStrategy {
    double apply(double price);
}
class BlackFridayDiscount implements DiscountStrategy {
    public double apply(double price) { return price * 0.7; }
}
// Add new discounts without modifying existing code
```

**172 — LSP (Liskov Substitution):**
```java
// Violation: Square overrides Rectangle in unexpected way
class Rectangle { void setWidth(int w); void setHeight(int h); }
class Square extends Rectangle {
    void setWidth(int w) { super.setWidth(w); super.setHeight(w); } // Surprise!
}
// Fix: Don't inherit. Use separate classes or a Shape interface.
```

**173 — ISP (Interface Segregation):**
```java
// Bad: fat interface
interface Worker { void work(); void eat(); void sleep(); }
// Robot can't eat or sleep!

// Good: segregated
interface Workable { void work(); }
interface Feedable { void eat(); }
class Robot implements Workable { public void work() { ... } }
class Human implements Workable, Feedable { ... }
```

**174 — DIP (Dependency Inversion):**
```java
// Bad: high-level depends on low-level
class OrderService {
    private MySQLRepository repo = new MySQLRepository(); // Tight coupling
}

// Good: depend on abstraction
class OrderService {
    private final OrderRepository repo;  // Interface
    OrderService(OrderRepository repo) { this.repo = repo; }  // Inject
}
```

🔥 **Most Asked**: SRP and DIP are the most tested. LSP with the Square/Rectangle example.
🧠 **Strategy**: "SRP = one reason to change. OCP = extend via new classes. LSP = subtypes must honor contracts. ISP = small interfaces. DIP = inject abstractions"

---

## 175. Composition over Inheritance

### Q: Why is composition preferred over inheritance?

**Answer (Interview-Ready):**

```java
// Inheritance: rigid hierarchy
class Animal { void move() { ... } }
class Bird extends Animal { void fly() { ... } }
class Penguin extends Bird { /* Can't fly! Violates LSP */ }

// Composition: flexible behavior assembly
interface Movable { void move(); }
interface Flyable { void fly(); }

class Sparrow implements Movable, Flyable {
    private final FlightBehavior flight = new WingFlight();
    public void fly() { flight.fly(); }
    public void move() { flight.fly(); }
}

class Penguin implements Movable {
    public void move() { /* waddle */ }
    // No fly — not forced into it
}
```

| | Inheritance | Composition |
|-|------------|-------------|
| Coupling | Tight (parent-child) | Loose (has-a) |
| Flexibility | Fixed at compile time | Swappable at runtime |
| Reuse | Vertical (up hierarchy) | Horizontal (mix behaviors) |
| Testing | Hard to mock parent | Easy to mock components |

🔥 **Most Asked**: Penguin-Bird problem, when inheritance IS appropriate (true is-a relationships)
🧠 **Strategy**: "Composition = has-a. Inheritance = is-a. Prefer composition for flexibility. Use inheritance for genuine type hierarchies"

---

## 176. Tight Coupling vs Loose Coupling

### Q: What is coupling and how do you reduce it?

**Answer (Interview-Ready):**

| Tight Coupling | Loose Coupling |
|----------------|---------------|
| Class A directly creates Class B | Class A depends on Interface B |
| Changing B breaks A | Changing B's implementation doesn't break A |
| Hard to test in isolation | Easy to mock/stub |
| Faster to write initially | Faster to maintain long-term |

**Techniques to reduce coupling:**
1. Depend on interfaces/abstractions (DIP)
2. Dependency injection
3. Event-driven communication
4. Message queues between services
5. Interface segregation (ISP)

```java
// Tight: OrderService knows about EmailService concrete class
class OrderService {
    private EmailService email = new EmailService();
    void placeOrder() { email.send("order placed"); }
}

// Loose: OrderService emits event, doesn't know who handles it
class OrderService {
    private EventBus bus;
    void placeOrder() { bus.publish(new OrderPlacedEvent(orderId)); }
}
```

🔥 **Most Asked**: Examples of tight vs loose, how to reduce coupling, DI as coupling reducer

---

## 177. Dependency Injection (Constructor vs Field vs Setter)

### Q: Compare the three types of dependency injection.

**Answer (Interview-Ready):**

```java
// 1. Constructor Injection (PREFERRED)
class OrderService {
    private final OrderRepository repo;
    private final PaymentGateway payment;
    
    OrderService(OrderRepository repo, PaymentGateway payment) {
        this.repo = repo;
        this.payment = payment;
    }
}
// ✅ Immutable, clear dependencies, easy to test

// 2. Setter Injection
class OrderService {
    private OrderRepository repo;
    void setRepo(OrderRepository repo) { this.repo = repo; }
}
// ⚠️ Mutable, can be in invalid state (repo = null)

// 3. Field Injection (Spring @Autowired)
class OrderService {
    @Autowired private OrderRepository repo;
}
// ❌ Hidden dependencies, hard to test without Spring context
```

| Type | Immutable | Testable | Clear Deps |
|------|-----------|----------|-----------|
| Constructor | ✅ | ✅ | ✅ |
| Setter | ❌ | ✅ | ⚠️ |
| Field | ❌ | ❌ | ❌ |

🔥 **Most Asked**: Why constructor injection is preferred, Spring @Autowired pitfalls
🧠 **Strategy**: "Constructor injection: immutable, testable, explicit. Field injection hides dependencies. Setter for optional deps only"

---

## 178. Inversion of Control (IoC)

### Q: What is IoC and how does it relate to DI?

**Answer (Interview-Ready):**

**IoC = the framework controls object creation and lifecycle, not your code.**

```
Traditional:               IoC:
You create objects         Framework creates objects
You call libraries         Framework calls your code
You manage lifecycle       Container manages lifecycle
```

**DI is one form of IoC.** Others: Template Method pattern, event-driven callbacks, service locators.

```java
// Without IoC: you manage everything
OrderService service = new OrderService(
    new MySQLOrderRepo(),
    new StripePaymentGateway()
);

// With Spring IoC: container manages everything
@Service
class OrderService {
    OrderService(OrderRepository repo, PaymentGateway payment) { ... }
}
// Spring finds implementations, creates instances, injects them
```

🔥 **Most Asked**: IoC vs DI (IoC is broader), Spring container as IoC example
🧠 **Strategy**: "IoC = don't call us, we'll call you. DI is a form of IoC. Spring container is the IoC implementation"

---

# Part J — Creational Patterns (Topics 179–182)

---

## 179. Singleton (and Why It's Dangerous)

### Q: Explain the Singleton pattern and its drawbacks.

**Answer (Interview-Ready):**

```java
// Thread-safe Singleton (Bill Pugh / static inner class)
public class DatabasePool {
    private DatabasePool() {}
    
    private static class Holder {
        static final DatabasePool INSTANCE = new DatabasePool();
    }
    
    public static DatabasePool getInstance() {
        return Holder.INSTANCE;
    }
}
```

**Why it's dangerous:**
| Problem | Impact |
|---------|--------|
| Global state | Hidden dependencies, hard to reason about |
| Testing | Can't substitute mock easily |
| Concurrency | Shared mutable state = race conditions |
| Tight coupling | Every consumer depends on the concrete class |

**When acceptable:** Logger, configuration (read-only), connection pool (managed by framework).

**Better alternative:** DI with singleton scope — Spring's `@Scope("singleton")` gives you one instance without the pattern's drawbacks.

🔥 **Most Asked**: Thread safety, why it's an anti-pattern, alternatives
🧠 **Strategy**: "Know the pattern but explain the drawbacks. Prefer DI with singleton scope. Acceptable for infrastructure (logger)"

---

## 180–181. Factory & Abstract Factory

### Q: Explain Factory and Abstract Factory patterns.

**Answer (Interview-Ready):**

**180 — Factory Method:**
```java
interface Notification { void send(String message); }
class EmailNotification implements Notification { ... }
class SMSNotification implements Notification { ... }
class PushNotification implements Notification { ... }

class NotificationFactory {
    static Notification create(String type) {
        return switch (type) {
            case "email" -> new EmailNotification();
            case "sms"   -> new SMSNotification();
            case "push"  -> new PushNotification();
            default -> throw new IllegalArgumentException("Unknown: " + type);
        };
    }
}
// Client: Notification n = NotificationFactory.create("email");
```

**181 — Abstract Factory:**
```java
// Family of related objects
interface UIFactory {
    Button createButton();
    TextField createTextField();
}

class MaterialUIFactory implements UIFactory {
    public Button createButton() { return new MaterialButton(); }
    public TextField createTextField() { return new MaterialTextField(); }
}

class FluentUIFactory implements UIFactory {
    public Button createButton() { return new FluentButton(); }
    public TextField createTextField() { return new FluentTextField(); }
}

// Client works with any UI family without knowing which
UIFactory factory = config.isDarkMode() ? new DarkFactory() : new LightFactory();
Button btn = factory.createButton();
```

| | Factory Method | Abstract Factory |
|-|---------------|-----------------|
| Creates | One product | Family of products |
| Complexity | Simple | Higher |
| Use case | Single object creation | Related objects that must be consistent |

🔥 **Most Asked**: Factory vs Abstract Factory, when to use each

---

## 182. Builder Pattern

### Q: When do you use the Builder pattern?

**Answer (Interview-Ready):**

```java
// Problem: constructor with too many parameters
User user = new User("Hruday", "D", "hruday@email.com", 28, "Senior", true, false, "India");
// What's the 5th parameter? 🤷

// Solution: Builder
User user = User.builder()
    .firstName("Hruday")
    .lastName("D")
    .email("hruday@email.com")
    .age(28)
    .role("Senior")
    .active(true)
    .build();

// Implementation
public class User {
    private final String firstName, lastName, email;
    
    private User(Builder b) {
        this.firstName = b.firstName;
        this.lastName = b.lastName;
        this.email = b.email;
    }
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private String firstName, lastName, email;
        
        public Builder firstName(String v) { firstName = v; return this; }
        public Builder lastName(String v) { lastName = v; return this; }
        public Builder email(String v) { email = v; return this; }
        public User build() {
            // Validate required fields
            Objects.requireNonNull(email, "Email required");
            return new User(this);
        }
    }
}
```

**When to use:** 4+ constructor parameters, optional parameters, immutable objects, fluent APIs.

**Shortcut:** Lombok's `@Builder` annotation generates all this.

🔥 **Most Asked**: When to use, Lombok @Builder, validation in build()
🧠 **Strategy**: "Builder for readable construction of complex objects. 4+ params = consider Builder. Validate in build()"

---

# Part K — Structural Patterns (Topics 183–186)

---

## 183. Adapter Pattern

### Q: What is the Adapter pattern and when do you use it?

**Answer (Interview-Ready):**

**Adapter = makes incompatible interfaces work together.**

```java
// Old payment system interface
interface LegacyPayment {
    void processPayment(double amount, String currency);
}

// New Stripe SDK (different interface)
class StripeClient {
    void charge(ChargeRequest request) { ... }
}

// Adapter: makes Stripe look like LegacyPayment
class StripeAdapter implements LegacyPayment {
    private final StripeClient stripe;
    
    StripeAdapter(StripeClient stripe) { this.stripe = stripe; }
    
    public void processPayment(double amount, String currency) {
        ChargeRequest req = new ChargeRequest(amount, currency);
        stripe.charge(req);
    }
}
// Client code using LegacyPayment interface doesn't change!
```

**Use cases:** Integrating third-party libraries, legacy system migration, API version bridging.

🔥 **Most Asked**: When to use, real-world examples (SDK integration)

---

## 184. Decorator Pattern

### Q: How does the Decorator pattern add behavior dynamically?

**Answer (Interview-Ready):**

```java
interface DataSource {
    String read();
    void write(String data);
}

class FileDataSource implements DataSource {
    public String read() { return readFromFile(); }
    public void write(String data) { writeToFile(data); }
}

// Decorators wrap the base and add behavior
class EncryptionDecorator implements DataSource {
    private final DataSource wrapped;
    EncryptionDecorator(DataSource ds) { this.wrapped = ds; }
    
    public String read() { return decrypt(wrapped.read()); }
    public void write(String data) { wrapped.write(encrypt(data)); }
}

class CompressionDecorator implements DataSource {
    private final DataSource wrapped;
    CompressionDecorator(DataSource ds) { this.wrapped = ds; }
    
    public String read() { return decompress(wrapped.read()); }
    public void write(String data) { wrapped.write(compress(data)); }
}

// Stack decorators: compress → encrypt → write to file
DataSource source = new CompressionDecorator(
    new EncryptionDecorator(
        new FileDataSource("data.txt")
    )
);
source.write("sensitive data");
```

**Java I/O uses this:** `BufferedReader(new InputStreamReader(new FileInputStream(...)))`.

🔥 **Most Asked**: Java I/O as real example, vs inheritance (decorator is runtime, inheritance is compile-time)

---

## 185. Proxy Pattern

### Q: What is the Proxy pattern?

**Answer (Interview-Ready):**

```java
// Types of proxies
// 1. Virtual Proxy (lazy loading)
class LazyImageProxy implements Image {
    private RealImage real;
    private final String url;
    
    public void display() {
        if (real == null) real = new RealImage(url);  // Load on first use
        real.display();
    }
}

// 2. Protection Proxy (access control)
class SecuredServiceProxy implements Service {
    private final Service real;
    private final AuthContext auth;
    
    public void execute() {
        if (!auth.hasPermission("ADMIN")) throw new AccessDeniedException();
        real.execute();
    }
}

// 3. Caching Proxy
class CachingApiProxy implements ApiClient {
    private final ApiClient real;
    private final Map<String, Response> cache = new HashMap<>();
    
    public Response get(String url) {
        return cache.computeIfAbsent(url, real::get);
    }
}
```

🔥 **Most Asked**: Three types (virtual, protection, caching), Spring AOP uses proxies

---

## 186. Facade Pattern

### Q: What is the Facade pattern?

**Answer (Interview-Ready):**

**Facade = simple interface to a complex subsystem.**

```java
// Complex subsystem classes
class InventoryService { boolean check(String productId) { ... } }
class PaymentService { Receipt charge(double amount) { ... } }
class ShippingService { String schedule(String address) { ... } }
class NotificationService { void send(String email, String msg) { ... } }

// Facade: simple interface for "place order"
class OrderFacade {
    private final InventoryService inventory;
    private final PaymentService payment;
    private final ShippingService shipping;
    private final NotificationService notification;
    
    public OrderResult placeOrder(Order order) {
        if (!inventory.check(order.productId())) throw new OutOfStockException();
        Receipt receipt = payment.charge(order.total());
        String trackingId = shipping.schedule(order.address());
        notification.send(order.email(), "Order placed: " + trackingId);
        return new OrderResult(receipt, trackingId);
    }
}
// Client: orderFacade.placeOrder(order); // One call instead of four
```

🔥 **Most Asked**: Real-world examples (payment processing, API gateway), vs Adapter
🧠 **Strategy**: "Facade simplifies. Adapter converts. Facade = new simple API over complex subsystem"

---

# Part L — Behavioral Patterns (Topics 187–191)

---

## 187. Strategy Pattern

### Q: Explain the Strategy pattern with a real example.

**Answer (Interview-Ready):**

```java
// Define strategy interface
interface CompressionStrategy {
    byte[] compress(byte[] data);
}

class GzipCompression implements CompressionStrategy {
    public byte[] compress(byte[] data) { /* gzip */ return gzipped; }
}

class ZipCompression implements CompressionStrategy {
    public byte[] compress(byte[] data) { /* zip */ return zipped; }
}

// Context uses strategy
class FileCompressor {
    private CompressionStrategy strategy;
    
    FileCompressor(CompressionStrategy strategy) { this.strategy = strategy; }
    
    void setStrategy(CompressionStrategy s) { this.strategy = s; }
    
    byte[] compress(byte[] data) {
        return strategy.compress(data);
    }
}

// Usage: swap algorithm at runtime
FileCompressor compressor = new FileCompressor(new GzipCompression());
compressor.setStrategy(new ZipCompression());  // Switch strategy
```

**Real-world uses:** Sorting algorithms, payment processing, validation rules, pricing strategies.

🔥 **Most Asked**: Strategy vs if-else chains, runtime swapping, OCP compliance
🧠 **Strategy**: "Strategy = interchangeable algorithms. Eliminates if-else chains. Swap at runtime. Follows OCP"

---

## 188. Observer Pattern

### Q: How does the Observer pattern work?

**Answer (Interview-Ready):**

```java
interface EventListener {
    void update(String eventType, Object data);
}

class EventManager {
    private final Map<String, List<EventListener>> listeners = new HashMap<>();
    
    void subscribe(String event, EventListener listener) {
        listeners.computeIfAbsent(event, k -> new ArrayList<>()).add(listener);
    }
    
    void unsubscribe(String event, EventListener listener) {
        listeners.getOrDefault(event, List.of()).remove(listener);
    }
    
    void notify(String event, Object data) {
        listeners.getOrDefault(event, List.of())
            .forEach(l -> l.update(event, data));
    }
}

// Publisher
class OrderService {
    private final EventManager events = new EventManager();
    
    void placeOrder(Order order) {
        // ... process order
        events.notify("order.placed", order);
    }
}

// Subscribers
class EmailNotifier implements EventListener {
    public void update(String event, Object data) { sendEmail((Order) data); }
}
class InventoryUpdater implements EventListener {
    public void update(String event, Object data) { updateStock((Order) data); }
}
```

**In frontend:** DOM events, RxJS Observables, React `useEffect` with dependency array, EventEmitter.

🔥 **Most Asked**: Pub/sub vs Observer, memory leaks (unsubscribe!), real-world uses
🧠 **Strategy**: "Observer = subject notifies subscribers on state change. Always unsubscribe to prevent leaks. DOM events are observer pattern"

---

## 189. Command Pattern

### Q: When do you use the Command pattern?

**Answer (Interview-Ready):**

```java
interface Command {
    void execute();
    void undo();
}

class AddTextCommand implements Command {
    private final Document doc;
    private final String text;
    private final int position;
    
    AddTextCommand(Document doc, String text, int position) {
        this.doc = doc; this.text = text; this.position = position;
    }
    
    public void execute() { doc.insert(text, position); }
    public void undo() { doc.delete(position, text.length()); }
}

// Command invoker with undo/redo stack
class Editor {
    private final Deque<Command> undoStack = new ArrayDeque<>();
    private final Deque<Command> redoStack = new ArrayDeque<>();
    
    void executeCommand(Command cmd) {
        cmd.execute();
        undoStack.push(cmd);
        redoStack.clear();
    }
    
    void undo() {
        if (!undoStack.isEmpty()) {
            Command cmd = undoStack.pop();
            cmd.undo();
            redoStack.push(cmd);
        }
    }
}
```

**Use cases:** Undo/redo, transaction queues, macro recording, task scheduling.

🔥 **Most Asked**: Undo/redo implementation, difference from Strategy (Command encapsulates action + data)

---

## 190. Chain of Responsibility

### Q: How does Chain of Responsibility work?

**Answer (Interview-Ready):**

```java
abstract class Handler {
    private Handler next;
    
    Handler setNext(Handler next) { this.next = next; return next; }
    
    void handle(Request request) {
        if (canHandle(request)) {
            process(request);
        } else if (next != null) {
            next.handle(request);
        } else {
            throw new UnhandledRequestException();
        }
    }
    
    abstract boolean canHandle(Request request);
    abstract void process(Request request);
}

// Build chain
Handler chain = new AuthHandler();
chain.setNext(new RateLimitHandler())
     .setNext(new ValidationHandler())
     .setNext(new BusinessHandler());

chain.handle(request);
// Auth → Rate Limit → Validation → Business Logic
```

**Real-world:** Servlet filters, Spring Security filter chain, Express.js middleware, DOM event bubbling.

🔥 **Most Asked**: Middleware as CoR, servlet filter chain, when to use
🧠 **Strategy**: "Chain of Responsibility = pass request along chain of handlers. Middleware is CoR. Each handler decides: process or pass"

---

## 191. Template Method

### Q: What is the Template Method pattern?

**Answer (Interview-Ready):**

```java
abstract class DataProcessor {
    // Template method — defines the algorithm skeleton
    public final void process() {
        readData();
        parseData();
        validate();
        transform();
        save();
    }
    
    abstract void readData();      // Subclass provides
    abstract void parseData();     // Subclass provides
    
    void validate() { /* default validation */ }
    void transform() { /* default: no transformation */ }
    abstract void save();
}

class CSVProcessor extends DataProcessor {
    void readData() { /* read CSV file */ }
    void parseData() { /* parse CSV rows */ }
    void save() { /* save to DB */ }
}

class APIProcessor extends DataProcessor {
    void readData() { /* call API */ }
    void parseData() { /* parse JSON */ }
    void save() { /* save to DB */ }
}
```

**Template Method vs Strategy:**
| Template Method | Strategy |
|----------------|----------|
| Uses inheritance | Uses composition |
| Algorithm skeleton fixed | Entire algorithm swappable |
| Override steps | Inject whole strategy |

🔥 **Most Asked**: vs Strategy, real-world examples (JUnit lifecycle, Spring's JdbcTemplate)

---

# Part M — Pattern Selection & Anti-Patterns (Topics 192–193)

---

## 192. When NOT to Use Design Patterns

### Q: When should you avoid design patterns?

**Answer (Interview-Ready):**

**Don't use patterns when:**
- **Simple code works** — if-else for 2-3 cases doesn't need Strategy pattern
- **YAGNI** — don't add Factory for one implementation
- **Team doesn't know the pattern** — clever code ≠ maintainable code
- **Performance-critical path** — indirection has overhead
- **Prototype/MVP** — ship first, refactor later

**Pattern smell checklist:**
| 🚩 Smell | Pattern Overkill |
|----------|-----------------|
| Single implementation of interface | Premature abstraction |
| Factory that creates one type | Unnecessary Factory |
| Observer with one subscriber | Just call the method |
| Strategy with one algorithm | YAGNI |

🔥 **Most Asked**: YAGNI examples, when patterns become anti-patterns
🧠 **Strategy**: "Patterns solve recurring problems. If the problem doesn't recur, the pattern is overhead. Start simple, refactor to patterns when needed"

---

## 193. Anti-Patterns (God Object, Spaghetti Code)

### Q: What are common anti-patterns and how do you fix them?

**Answer (Interview-Ready):**

| Anti-Pattern | Description | Fix |
|-------------|-------------|-----|
| **God Object** | One class does everything (5000+ lines) | Split by SRP |
| **Spaghetti Code** | Tangled control flow, no structure | Extract methods, add layers |
| **Golden Hammer** | Using one tool for everything | Choose right tool per problem |
| **Premature Optimization** | Optimizing before measuring | Profile first |
| **Lava Flow** | Dead code nobody dares delete | Test coverage → remove safely |
| **Copy-Paste** | Duplicated code everywhere | Extract shared utilities |
| **Magic Numbers** | `if (status == 3)` | Named constants / enums |

**God Object example:**
```java
// Bad: 3000-line UserService doing auth, profile, billing, notifications
class UserService { ... }

// Good: split into focused services
class AuthService { ... }
class ProfileService { ... }
class BillingService { ... }
class NotificationService { ... }
```

🔥 **Most Asked**: God Object, how to identify anti-patterns in code review
🧠 **Strategy**: "God Object = split by SRP. Spaghetti = add layers. Premature optimization = profile first. Dead code = test + delete"

---

# Part N — Clean Code & Engineering (Topics 194–202)

---

## 194–196. KISS, DRY, YAGNI

### Q: Explain KISS, DRY, and YAGNI with examples.

**Answer (Interview-Ready):**

**194 — KISS (Keep It Simple, Stupid):**
```java
// Over-engineered: AbstractStrategyFactoryBuilderProxy
// Simple: if-else that's readable and works

// Bad: Generic EventBus for 2 components talking to each other
// Good: Direct method call or callback
```

**195 — DRY (Don't Repeat Yourself):**
```java
// Bad: validation logic in 5 controllers
// Good: shared @Valid annotation + custom validator

// But! "Wrong abstraction is worse than duplication"
// If two things look similar but change for different reasons → keep separate
```

**196 — YAGNI (You Aren't Gonna Need It):**
```java
// Bad: Building plugin system for an app with one use case
// Good: Hardcode now. Refactor to plugin system when second plugin is needed.

// Rule of Three: acceptable to duplicate once. Third time → abstract.
```

| Principle | Tension |
|-----------|---------|
| DRY vs Wrong Abstraction | Similar code ≠ same responsibility |
| KISS vs Extensibility | Simple now vs flexible later |
| YAGNI vs Planning | Don't build ahead, but design for change |

🔥 **Most Asked**: Tensions between principles, when DRY leads to wrong abstraction
🧠 **Strategy**: "KISS: simplest solution. DRY: don't repeat, but wrong abstraction is worse. YAGNI: build for today, design for tomorrow"

---

## 197–198. Clean Code & Code Smells

### Q: What are clean code principles and how do you identify code smells?

**Answer (Interview-Ready):**

**197 — Clean Code Principles:**
| Principle | Guideline |
|-----------|-----------|
| **Naming** | `getUserById()` not `getU()`. Names reveal intent |
| **Methods** | Small (< 20 lines), do one thing, one level of abstraction |
| **Classes** | SRP, small public surface, encapsulate internals |
| **Comments** | Code should be self-documenting. Comments for "why", not "what" |
| **Formatting** | Consistent. Newspaper metaphor: important stuff at top |

**198 — Code Smells:**
| Smell | Symptom | Refactoring |
|-------|---------|-------------|
| Long Method | 50+ lines | Extract Method |
| Long Parameter List | 5+ params | Introduce Parameter Object / Builder |
| Feature Envy | Method uses another class's data more than its own | Move Method |
| Data Clumps | Same 3 fields always together | Extract Class |
| Primitive Obsession | Using String for email, phone | Value Objects |
| Divergent Change | One class changes for multiple reasons | Split by SRP |
| Shotgun Surgery | One change requires editing 10 files | Consolidate |

🔥 **Most Asked**: Naming conventions, method length, identifying smells in code review

---

## 199–200. Refactoring & Testable Code

### Q: What are key refactoring techniques and how do you write testable code?

**Answer (Interview-Ready):**

**199 — Refactoring Techniques:**
```java
// Extract Method
void processOrder(Order order) {
    validate(order);
    calculateTotals(order);
    applyDiscount(order);
    save(order);
}

// Replace Conditional with Polymorphism
// Before: if (type == "email") ... else if (type == "sms") ...
// After: notification.send(message);  // Strategy pattern

// Introduce Parameter Object
// Before: search(String query, int page, int size, String sort, boolean asc)
// After: search(SearchCriteria criteria)
```

**200 — Writing Testable Code:**
| ✅ Testable | ❌ Not Testable |
|------------|----------------|
| Constructor injection | `new` inside methods |
| Pure functions | Static method calls |
| Interface dependencies | Concrete class dependencies |
| Small, focused methods | God methods (500 lines) |
| No global state | Singleton state |

```java
// Not testable: creates its own dependency
class OrderService {
    void process(Order o) {
        PaymentGateway gw = new StripeGateway();  // Can't mock!
        gw.charge(o.total());
    }
}

// Testable: dependency injected
class OrderService {
    private final PaymentGateway gw;
    OrderService(PaymentGateway gw) { this.gw = gw; }
    void process(Order o) { gw.charge(o.total()); }
}
```

🔥 **Most Asked**: Extract Method, testable code patterns, DI for testability

---

## 201–202. Defensive Programming & Fail Fast vs Fail Safe

### Q: What are defensive programming, fail-fast, and fail-safe strategies?

**Answer (Interview-Ready):**

**201 — Defensive Programming:**
```java
public void transfer(Account from, Account to, BigDecimal amount) {
    Objects.requireNonNull(from, "Source account required");
    Objects.requireNonNull(to, "Target account required");
    if (amount.compareTo(BigDecimal.ZERO) <= 0) {
        throw new IllegalArgumentException("Amount must be positive");
    }
    if (from.equals(to)) {
        throw new IllegalArgumentException("Cannot transfer to same account");
    }
    // Now safe to proceed
}
```

**Validate at boundaries** (API input, user input, external data), trust internal code.

**202 — Fail Fast vs Fail Safe:**
| Fail Fast | Fail Safe |
|-----------|-----------|
| Throw immediately on invalid state | Gracefully degrade |
| NullPointerException on null | Return default/empty |
| `ConcurrentModificationException` | Copy-on-write collections |
| Best for: development, catching bugs early | Best for: production resilience |

```java
// Fail fast: detect problem immediately
if (config == null) throw new IllegalStateException("Config not loaded");

// Fail safe: continue with defaults
String timeout = config != null ? config.getTimeout() : "30s";
```

🔥 **Most Asked**: When to fail fast vs fail safe, validate at boundaries, null handling
🧠 **Strategy**: "Fail fast in development to catch bugs. Fail safe in production for resilience. Validate at system boundaries"

---

# Part O — Java & Spring Internals (Topics 203–213)

---

## 203. JVM Basics (Heap, Stack, GC)

### Q: Explain JVM memory model and garbage collection.

**Answer (Interview-Ready):**

```
┌──────────────────────────────────────┐
│              JVM Memory              │
├──────────┬───────────────────────────┤
│  Stack   │  Heap                     │
│ (per     │ ┌─────────┬─────────────┐│
│  thread) │ │ Young   │   Old Gen   ││
│          │ │ Gen     │             ││
│ - local  │ │ Eden    │ Long-lived  ││
│   vars   │ │ S0, S1  │ objects     ││
│ - method │ └─────────┴─────────────┘│
│   frames │                          │
├──────────┼──────────────────────────┤
│ Metaspace│ Class metadata, method   │
│          │ info (off-heap)          │
└──────────┴──────────────────────────┘
```

| Area | Stores | Thread-safe |
|------|--------|------------|
| Stack | Primitives, references, method frames | Per-thread (safe) |
| Heap | Objects, arrays | Shared (needs sync) |
| Metaspace | Class metadata | Shared |

**Garbage Collection:**
- **Minor GC:** Cleans Young Gen (fast, frequent)
- **Major GC:** Cleans Old Gen (slow, infrequent — "stop the world")
- **GC algorithms:** G1 (default Java 9+), ZGC (low-latency), Shenandoah

**GC Roots:** Static variables, active threads, local variables, JNI references.

🔥 **Most Asked**: Stack vs heap, GC generations, G1 vs ZGC, "stop the world"
🧠 **Strategy**: "Stack = per-thread, fast. Heap = shared, GC-managed. Young Gen for short-lived. G1 is default. ZGC for low-latency"

---

## 204. Java Memory Leaks in Backend Systems

### Q: What causes memory leaks in Java and how do you diagnose them?

**Answer (Interview-Ready):**

| Cause | Example | Fix |
|-------|---------|-----|
| Unclosed resources | DB connections, streams not closed | try-with-resources |
| Static collections | `static List<User>` growing forever | Use WeakReference or bounded cache |
| Listener leaks | Event listeners never unregistered | Unsubscribe in cleanup |
| Thread local leaks | ThreadLocal not removed in thread pool | `threadLocal.remove()` in finally |
| Class loader leaks | Redeployment keeps old classloader | Fix static references to classloader |

**Diagnosis:**
```bash
# 1. Heap dump
jmap -dump:live,format=b,file=heap.hprof <pid>

# 2. Analyze with Eclipse MAT or VisualVM
# Look for: Retained heap, dominator tree, leak suspects

# 3. Monitor GC
-verbose:gc -Xlog:gc*
# Watch for: Old Gen growing continuously, Full GC frequency increasing
```

🔥 **Most Asked**: Common causes, heap dump analysis, ThreadLocal leaks in thread pools
🧠 **Strategy**: "Static collections, unclosed resources, listener leaks, ThreadLocal in pools. Diagnose with heap dump + MAT"

---

## 205–206. Thread Safety & Thread Pools

### Q: How do you handle concurrency in Java?

**Answer (Interview-Ready):**

**205 — Thread Safety:**
```java
// Problem: shared mutable state
private int count = 0;  // Not thread-safe!
void increment() { count++; }  // Read-modify-write = race condition

// Solutions:
// 1. synchronized
synchronized void increment() { count++; }

// 2. AtomicInteger (lock-free)
private final AtomicInteger count = new AtomicInteger(0);
void increment() { count.incrementAndGet(); }

// 3. Immutable objects (best)
record User(String name, int age) {}  // No setters = no races

// 4. ConcurrentHashMap (thread-safe collection)
Map<String, Integer> map = new ConcurrentHashMap<>();
```

**206 — Thread Pools:**
```java
// Fixed pool: bounded threads
ExecutorService pool = Executors.newFixedThreadPool(10);

// Custom pool: production-ready
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    5,           // core pool size
    20,          // max pool size
    60, TimeUnit.SECONDS,  // idle thread keepalive
    new LinkedBlockingQueue<>(100),  // work queue (bounded!)
    new ThreadPoolExecutor.CallerRunsPolicy()  // rejection policy
);

// Submit work
Future<String> result = pool.submit(() -> fetchData(url));
String data = result.get(5, TimeUnit.SECONDS);  // With timeout

// Virtual threads (Java 21+)
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    executor.submit(() -> handleRequest(req));
}
```

**Rejection policies:** AbortPolicy (throw), CallerRunsPolicy (caller executes), DiscardPolicy (silently drop).

🔥 **Most Asked**: Thread safety techniques, pool sizing, bounded queues, Java 21 virtual threads
🧠 **Strategy**: "Prefer immutability. AtomicInteger for counters. Bounded queue + rejection policy for pools. Virtual threads for I/O-bound"

---

## 207. Spring Boot Request Lifecycle

### Q: What happens when a request hits a Spring Boot application?

**Answer (Interview-Ready):**

```
Client Request (HTTP)
    │
    ▼
1. Tomcat (embedded) — accepts connection, creates thread from pool
    │
    ▼
2. Servlet Filter Chain — security, CORS, logging
    │
    ▼
3. DispatcherServlet — front controller, finds handler
    │
    ▼
4. HandlerInterceptor.preHandle() — auth checks, timing
    │
    ▼
5. Controller Method — @GetMapping, @PostMapping
    │
    ▼
6. Service Layer — business logic (@Transactional)
    │
    ▼
7. Repository Layer — DB access (JPA/JDBC)
    │
    ▼
8. HandlerInterceptor.postHandle() — modify model
    │
    ▼
9. Response serialization (Jackson → JSON)
    │
    ▼
10. Filter chain (response) — headers, compression
    │
    ▼
Client Response (HTTP)
```

**Exception flow:** @ControllerAdvice / @ExceptionHandler catches and formats errors.

🔥 **Most Asked**: Lifecycle order, DispatcherServlet role, filter vs interceptor timing
🧠 **Strategy**: "Tomcat → Filters → DispatcherServlet → Interceptors → Controller → Service → Repository. Exceptions caught by @ControllerAdvice"

---

## 208. Filters vs Interceptors vs AOP

### Q: Compare Spring's Filters, Interceptors, and AOP.

**Answer (Interview-Ready):**

| | Filter | Interceptor | AOP |
|-|--------|------------|-----|
| Level | Servlet (before Spring) | Spring MVC | Any Spring bean |
| Interface | `javax.servlet.Filter` | `HandlerInterceptor` | `@Aspect` |
| Access to | Request/Response only | Handler method info | Method + args + return |
| Use case | CORS, auth, logging | Request timing, role checks | Transactions, caching |
| Order | `@Order` / FilterRegistration | Interceptor registry order | `@Order` on aspect |

```java
// Filter: low-level, servlet API
@Component
public class LoggingFilter implements Filter {
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) {
        log.info("Request: {}", ((HttpServletRequest) req).getRequestURI());
        chain.doFilter(req, res);
    }
}

// Interceptor: Spring MVC, knows about handler
public class AuthInterceptor implements HandlerInterceptor {
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        // Can inspect @Annotation on handler method
        return isAuthorized(req);
    }
}

// AOP: cross-cutting concern on any bean method
@Aspect @Component
public class TimingAspect {
    @Around("@annotation(Timed)")
    public Object time(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.nanoTime();
        Object result = pjp.proceed();
        log.info("{} took {}ms", pjp.getSignature(), (System.nanoTime() - start) / 1_000_000);
        return result;
    }
}
```

🔥 **Most Asked**: When to use which, execution order, AOP for transactions
🧠 **Strategy**: "Filter for HTTP-level (CORS, encoding). Interceptor for Spring MVC (auth, timing). AOP for cross-cutting on any method"

---

## 209. @Transactional Internals

### Q: How does Spring's @Transactional work internally?

**Answer (Interview-Ready):**

```java
@Service
public class OrderService {
    @Transactional
    public void placeOrder(Order order) {
        orderRepo.save(order);
        paymentService.charge(order);  // If this throws...
        inventoryService.reserve(order);  // ...this is rolled back too
    }
}
```

**How it works (proxy-based):**
```
Client → Spring Proxy → Begin Transaction → Actual Method → Commit/Rollback
```

1. Spring creates a **proxy** around the bean (CGLIB or JDK proxy)
2. Proxy intercepts method call → begins transaction
3. Method executes
4. If no exception → **commit**
5. If RuntimeException → **rollback** (checked exceptions do NOT rollback by default!)

**Common pitfalls:**
| Pitfall | Problem | Fix |
|---------|---------|-----|
| Self-invocation | `this.methodB()` bypasses proxy | Inject self or refactor |
| Checked exception | Doesn't trigger rollback | `@Transactional(rollbackFor = Exception.class)` |
| Private method | Proxy can't intercept | Make method public |
| Long transaction | Holds DB connection | Keep transactions short |

🔥 **Most Asked**: Proxy mechanism, self-invocation problem, rollback rules
🧠 **Strategy**: "Proxy-based. RuntimeException = rollback. Checked = no rollback (unless configured). Self-calls bypass proxy"

---

## 210. Connection Pooling (HikariCP)

### Q: How does connection pooling work and why is HikariCP the default?

**Answer (Interview-Ready):**

```yaml
# application.yml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000  # 30s to get connection
      idle-timeout: 600000       # 10min idle before closing
      max-lifetime: 1800000      # 30min max connection age
```

**How it works:**
```
Application Thread → Request Connection → Pool
                                          ├── Idle connection available → Return immediately
                                          ├── Pool not full → Create new connection → Return
                                          └── Pool full → Wait (up to connection-timeout) → Timeout exception
```

**Why HikariCP:** Fastest pool in Java (bytecode-level optimizations, ConcurrentBag, lock-free).

**Pool sizing formula:** `connections = (2 × CPU cores) + disk spindles` (for OLTP). Typically 10-20 for most apps.

**Connection leak detection:**
```yaml
hikari:
  leak-detection-threshold: 5000  # Warn if connection held > 5s
```

🔥 **Most Asked**: Pool sizing, timeout configuration, leak detection
🧠 **Strategy**: "Pool reuses connections (creating is expensive: TCP + TLS + auth). HikariCP default in Spring Boot. Size: 2×cores + spindles"

---

## 211. ORM Pitfalls (N+1, Lazy Loading)

### Q: What is the N+1 problem and how do you fix it?

**Answer (Interview-Ready):**

```java
// N+1 Problem:
List<Author> authors = authorRepo.findAll();  // 1 query
for (Author a : authors) {
    a.getBooks().size();  // N queries (one per author!)
}
// Total: 1 + N queries!

// Fix 1: JOIN FETCH (JPQL)
@Query("SELECT a FROM Author a JOIN FETCH a.books")
List<Author> findAllWithBooks();
// Total: 1 query

// Fix 2: EntityGraph
@EntityGraph(attributePaths = {"books"})
List<Author> findAll();

// Fix 3: Batch fetching
@BatchSize(size = 25)
@OneToMany(mappedBy = "author")
private List<Book> books;
// Total: 1 + ceil(N/25) queries
```

**Lazy vs Eager:**
| | Lazy (default) | Eager |
|-|---------------|-------|
| When loaded | On access | With parent |
| N+1 risk | ✅ Yes | ❌ No |
| Over-fetching risk | ❌ No | ✅ Yes |
| Outside session | `LazyInitializationException` | No issue |

🔥 **Most Asked**: N+1 detection and fix, lazy vs eager, JOIN FETCH
🧠 **Strategy**: "N+1 = most common ORM pitfall. Fix with JOIN FETCH or EntityGraph. Default lazy, fetch eagerly only when needed"

---

## 212. Designing Idempotent APIs in Spring

### Q: How do you make APIs idempotent?

**Answer (Interview-Ready):**

**Idempotent = same request multiple times produces same result.**

| Method | Naturally Idempotent |
|--------|---------------------|
| GET | ✅ (read-only) |
| PUT | ✅ (full replace) |
| DELETE | ✅ (delete same resource) |
| POST | ❌ (creates new resource each time) |
| PATCH | ⚠️ (depends on operation) |

**Making POST idempotent:**
```java
@PostMapping("/payments")
public ResponseEntity<Payment> createPayment(
    @RequestHeader("Idempotency-Key") String idempotencyKey,
    @RequestBody PaymentRequest request) {
    
    // Check if this key was already processed
    Optional<Payment> existing = paymentRepo.findByIdempotencyKey(idempotencyKey);
    if (existing.isPresent()) {
        return ResponseEntity.ok(existing.get());  // Return cached result
    }
    
    Payment payment = processPayment(request);
    payment.setIdempotencyKey(idempotencyKey);
    paymentRepo.save(payment);
    return ResponseEntity.status(201).body(payment);
}
```

**Client sends:** `Idempotency-Key: <UUID>` in header. Server stores key + result. Duplicate request returns cached result.

🔥 **Most Asked**: POST idempotency, idempotency key pattern, database unique constraint
🧠 **Strategy**: "GET/PUT/DELETE are naturally idempotent. POST needs Idempotency-Key header + server-side deduplication"

---

## 213. Exception Handling Strategy (@ControllerAdvice)

### Q: How do you implement centralized exception handling in Spring Boot?

**Answer (Interview-Ready):**

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException ex) {
        return new ErrorResponse("NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(ValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(ValidationException ex) {
        return new ErrorResponse("VALIDATION_ERROR", ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ErrorResponse handleAccessDenied(AccessDeniedException ex) {
        return new ErrorResponse("FORBIDDEN", "Insufficient permissions");
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        return new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred");
        // Don't expose stack trace to client!
    }
}

record ErrorResponse(String code, String message) {}
```

**Exception hierarchy:**
```
ApplicationException (base)
├── ResourceNotFoundException (404)
├── ValidationException (400)
├── ConflictException (409)
└── BusinessRuleException (422)
```

**Best practices:**
- Specific exceptions before general
- Never expose stack traces to clients
- Log unhandled exceptions with context
- Consistent error response format across API

🔥 **Most Asked**: @ControllerAdvice setup, exception hierarchy, security (don't expose internals)
🧠 **Strategy**: "@ControllerAdvice for global handling. Custom exception hierarchy. Consistent error format. Never expose stack traces"

---

## ✅ File 09 Coverage Summary

| Part | Topics | Count |
|------|--------|-------|
| A — Web Components Fundamentals | 357–360 | 4 |
| B — Lightning Web Components | 361–365 | 5 |
| C — Framework Interop | 366–368 | 3 |
| D — SAP UI5 Architecture | 369–372 | 4 |
| E — Fiori Design System | 373–375 | 3 |
| F — Enterprise UI Patterns | 376–379 | 4 |
| G — Positioning SAP Experience | 380–382 | 3 |
| H — System Design Foundations | 383–387 | 5 |
| I — OOP & SOLID | 168–178 | 11 |
| J — Creational Patterns | 179–182 | 4 |
| K — Structural Patterns | 183–186 | 4 |
| L — Behavioral Patterns | 187–191 | 5 |
| M — Pattern Selection & Anti-Patterns | 192–193 | 2 |
| N — Clean Code & Engineering | 194–202 | 9 |
| O — Java & Spring Internals | 203–213 | 11 |
| **Total** | | **77** |

---

[⬅ Back to Master Index](00_MASTER_INDEX.md) | [⬆ Previous: 08_Performance_Quality.md](08_Performance_Quality.md) | [Next: 10_DSA_Behavioral_Revision.md ➡](10_DSA_Behavioral_Revision.md)
