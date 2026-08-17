# Salesforce — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Salesforce |
| **Role** | MTS-2 Frontend |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [Glassdoor](https://www.geeksforgeeks.org/salesforce-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical + HM)
- **Timeline:** 3 weeks
- **Note:** Salesforce uses LWC (Lightning Web Components) — know Web Components

---

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Implement a Pub/Sub system** (Event Bus)
2. **Build a Tabs component** (accessible, keyboard navigable)
3. **CSS: Implement a Tooltip that auto-positions** (above/below based on viewport)

### 💡 Accessible Tabs Component

```javascript
class AccessibleTabs {
  constructor(container, { tabs, defaultTab = 0 }) {
    this.container = container;
    this.tabs = tabs;
    this.activeTab = defaultTab;
    this.render();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="tabs-component">
        <div class="tab-list" role="tablist" aria-label="Content tabs">
          ${this.tabs.map((tab, i) => `
            <button role="tab"
                    id="tab-${i}"
                    aria-selected="${i === this.activeTab}"
                    aria-controls="panel-${i}"
                    tabindex="${i === this.activeTab ? 0 : -1}"
                    class="tab-btn ${i === this.activeTab ? 'active' : ''}">
              ${tab.label}
            </button>
          `).join('')}
        </div>
        
        ${this.tabs.map((tab, i) => `
          <div role="tabpanel"
               id="panel-${i}"
               aria-labelledby="tab-${i}"
               class="tab-panel"
               ${i !== this.activeTab ? 'hidden' : ''}
               tabindex="0">
            ${tab.content}
          </div>
        `).join('')}
      </div>
    `;
    
    this.attachEvents();
  }
  
  attachEvents() {
    const tabButtons = this.container.querySelectorAll('[role="tab"]');
    
    tabButtons.forEach((btn, i) => {
      btn.addEventListener('click', () => this.activate(i));
      
      btn.addEventListener('keydown', (e) => {
        let newIndex = this.activeTab;
        
        switch (e.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            e.preventDefault();
            newIndex = (this.activeTab + 1) % this.tabs.length;
            break;
          case 'ArrowLeft':
          case 'ArrowUp':
            e.preventDefault();
            newIndex = (this.activeTab - 1 + this.tabs.length) % this.tabs.length;
            break;
          case 'Home':
            e.preventDefault();
            newIndex = 0;
            break;
          case 'End':
            e.preventDefault();
            newIndex = this.tabs.length - 1;
            break;
          default:
            return;
        }
        
        this.activate(newIndex);
        tabButtons[newIndex].focus();
      });
    });
  }
  
  activate(index) {
    this.activeTab = index;
    
    const tabButtons = this.container.querySelectorAll('[role="tab"]');
    const panels = this.container.querySelectorAll('[role="tabpanel"]');
    
    tabButtons.forEach((btn, i) => {
      btn.setAttribute('aria-selected', i === index);
      btn.setAttribute('tabindex', i === index ? 0 : -1);
      btn.classList.toggle('active', i === index);
    });
    
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
    });
  }
}
```

### 💡 Auto-Positioning Tooltip

```javascript
class Tooltip {
  constructor() {
    this.tooltip = null;
    this.init();
  }
  
  init() {
    document.addEventListener('mouseenter', (e) => {
      const trigger = e.target.closest('[data-tooltip]');
      if (trigger) this.show(trigger);
    }, true);
    
    document.addEventListener('mouseleave', (e) => {
      const trigger = e.target.closest('[data-tooltip]');
      if (trigger) this.hide();
    }, true);
  }
  
  show(trigger) {
    const text = trigger.dataset.tooltip;
    
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    this.tooltip.setAttribute('role', 'tooltip');
    this.tooltip.textContent = text;
    document.body.appendChild(this.tooltip);
    
    this.position(trigger);
  }
  
  position(trigger) {
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const OFFSET = 8;
    
    // Default: show above
    let top = triggerRect.top - tooltipRect.height - OFFSET;
    let left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
    let placement = 'top';
    
    // If clipped at top → show below
    if (top < 0) {
      top = triggerRect.bottom + OFFSET;
      placement = 'bottom';
    }
    
    // If clipped at bottom → show above (original)
    if (top + tooltipRect.height > window.innerHeight) {
      top = triggerRect.top - tooltipRect.height - OFFSET;
      placement = 'top';
    }
    
    // Horizontal clamping
    left = Math.max(OFFSET, Math.min(left, window.innerWidth - tooltipRect.width - OFFSET));
    
    this.tooltip.style.cssText = `
      position: fixed;
      top: ${top}px;
      left: ${left}px;
      z-index: 10000;
    `;
    this.tooltip.dataset.placement = placement;
  }
  
  hide() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }
}
```

---

## Round 2: Web Components + LWC
**Duration:** 60 minutes

### Questions Asked
1. **Explain Shadow DOM vs Light DOM**
2. **Build a reusable Data Table as a Web Component** (Custom Element)
3. **How does Salesforce's LWC differ from standard Web Components?**

### 💡 Shadow DOM vs Light DOM

```javascript
// Shadow DOM: encapsulated DOM tree with scoped CSS
class MyComponent extends HTMLElement {
  constructor() {
    super();
    // Attach shadow root → styles are SCOPED
    const shadow = this.attachShadow({ mode: 'open' });
    
    shadow.innerHTML = `
      <style>
        /* This CSS only affects elements INSIDE this shadow DOM */
        .title { color: red; font-size: 20px; }
        /* External CSS CANNOT reach these elements (except CSS custom properties) */
      </style>
      <h2 class="title">Shadow DOM Content</h2>
      <slot></slot> <!-- Projection point for light DOM children -->
    `;
  }
}
customElements.define('my-component', MyComponent);

// Usage:
// <my-component>
//   <p>This is light DOM content (projected into <slot>)</p>
// </my-component>

// Key differences:
// Shadow DOM: styles scoped, DOM hidden from querySelector, events retargeted
// Light DOM: regular DOM, global CSS applies, accessible to parent querySelector
// Slots: bridge between shadow and light DOM (like React's children)
```

### 💡 LWC vs Standard Web Components

```
LWC (Lightning Web Components) — Salesforce's framework:
┌──────────────────────────────────────────────────────────────┐
│  Standard Web Components:                                     │
│  - Vanilla: no framework, just browser APIs                  │
│  - HTMLElement, Shadow DOM, Custom Elements, Templates       │
│  - No reactivity system (manual DOM updates)                 │
│  - No lifecycle beyond connected/disconnected callbacks      │
│                                                                │
│  LWC adds:                                                    │
│  1. Reactive properties: @track, @api decorators             │
│     → automatic re-render on property change                 │
│  2. Template expressions: {propertyName} in HTML             │
│  3. Wire service: @wire(getContacts) → auto-fetch data       │
│  4. Event system: CustomEvent + bubbling across shadow DOM   │
│  5. Security: Locker Service (sandbox per component)         │
│  6. CSS: synthetic shadow DOM (for cross-browser compat)     │
│  7. Testing: @lwc/jest for unit testing                      │
│                                                                │
│  Key insight: LWC compiles down to standard Web Components   │
│  but adds reactivity + data binding that vanilla WC lacks.   │
│  Compare: LWC is to Web Components what React is to DOM.     │
└──────────────────────────────────────────────────────────────┘
```

---

## Round 3: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Salesforce's Lightning App Builder** (drag-and-drop page builder)
   - Drag components from palette onto canvas, configure properties, save/publish

### 💡 Interview-Ready Answer

```
App Builder Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Layout: Three-Panel Design                                   │
│  ┌──────────┬────────────────────────┬──────────────┐        │
│  │Component │    Canvas (Drop Zone)   │  Properties  │        │
│  │Palette   │                         │  Panel       │        │
│  │          │  ┌──────────────────┐  │              │        │
│  │ ☐ Chart  │  │  Header Component │  │ Label: [...] │        │
│  │ ☐ Table  │  ├──────────────────┤  │ Color: [...] │        │
│  │ ☐ Form   │  │  Two-Column      │  │ Data:  [...] │        │
│  │ ☐ List   │  │  ┌─────┬──────┐  │  │              │        │
│  │ ☐ KPI    │  │  │Chart│Table │  │  │              │        │
│  │          │  │  └─────┘──────┘  │  │              │        │
│  │          │  └──────────────────┘  │              │        │
│  └──────────┴────────────────────────┴──────────────┘        │
│                                                                │
│  Page Schema (JSON):                                          │
│  {                                                            │
│    "type": "page",                                           │
│    "layout": "two-column",                                   │
│    "children": [                                              │
│      {                                                        │
│        "type": "sf-chart",                                   │
│        "id": "comp_123",                                     │
│        "props": {                                             │
│          "chartType": "bar",                                 │
│          "dataSource": "opportunities",                      │
│          "title": "Q4 Pipeline"                              │
│        },                                                     │
│        "slot": "left"                                        │
│      },                                                       │
│      { "type": "sf-data-table", "id": "comp_456", ... }     │
│    ]                                                          │
│  }                                                            │
│                                                                │
│  Drag & Drop:                                                 │
│  - HTML5 Drag and Drop API                                   │
│  - Visual drop indicators (blue line where component lands)  │
│  - Reordering within canvas: same drag-drop with reorder     │
│  - Undo/Redo: Command pattern stack                          │
│  - Keyboard: Tab to focus component → Enter to select →      │
│    Arrow keys to reorder → Delete to remove                  │
│                                                                │
│  Component Registry:                                          │
│  - Each LWC component registers: name, icon, default props,  │
│    configurable properties (type, validation, options)        │
│  - Properties panel dynamically generated from component's   │
│    property schema (like JSON Schema → form)                 │
│  - Data binding: props can reference record fields,          │
│    global variables, or static values                        │
│                                                                │
│  Save/Publish:                                                │
│  - Save: store JSON schema to server (draft mode)            │
│  - Publish: deploy → CDN invalidation → users see new layout│
│  - Version history: each save creates a version              │
│  - Rollback: revert to any previous version                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Salesforce tests **Web Components knowledge** — Shadow DOM, slots, Custom Elements
- **Accessible Tabs** (ARIA tabs pattern) = must-know for any FE interview
- **Auto-positioning tooltip** tests viewport boundary detection — `getBoundingClientRect` + clamping
- Know **LWC vs standard Web Components** — Salesforce adds reactivity, wire service, security
- **App Builder design** = classic no-code builder pattern — JSON schema, drag-drop, property editor
- **Command pattern** for undo/redo in builder interfaces
- Salesforce values **accessibility** highly — every component must be keyboard navigable

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | PubSub, Tabs, Tooltip |
| Web Components | Hard | Shadow DOM, LWC, Custom Elements |
| System Design | Hard | Page Builder, Drag-Drop, Component Registry |
| HM | Medium | Behavioral |
