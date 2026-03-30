# 354 – HTML Templates & Slots

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**`<template>`**: inert HTML that doesn't render until cloned via JS. Efficient for repeated rendering. **`<slot>`**: projection point inside Shadow DOM for external content. Named slots allow multiple projection points. Together they enable flexible, composable web components.

## 2. 🔬 DEEP-DIVE EXPLANATION

```html
<!-- ──── TEMPLATE ──── -->
<template id="card-template">
  <style>
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
    .card-title { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
  </style>
  <div class="card">
    <div class="card-title"><slot name="title">Default Title</slot></div>
    <div class="card-body"><slot>Default content</slot></div>
    <div class="card-footer"><slot name="footer"></slot></div>
  </div>
</template>
```

```typescript
// ──── USING TEMPLATE + SLOTS ────
class MyCard extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const template = document.getElementById('card-template') as HTMLTemplateElement;
    // cloneNode(true) deep clones — efficient for repeated use
    shadow.appendChild(template.content.cloneNode(true));
  }
}
customElements.define('my-card', MyCard);
```

```html
<!-- USAGE WITH NAMED SLOTS -->
<my-card>
  <h2 slot="title">Product Name</h2>
  <p>This content goes into the default (unnamed) slot</p>
  <button slot="footer">Buy Now</button>
</my-card>

<!-- RESULT (rendered): -->
<!-- 
  <div class="card">
    <div class="card-title"><h2>Product Name</h2></div>
    <div class="card-body"><p>This content goes into the default slot</p></div>
    <div class="card-footer"><button>Buy Now</button></div>
  </div>
-->
```

```typescript
// ──── INLINE TEMPLATE (common pattern) ────
class AlertBanner extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { display: block; }
        .alert { padding: 12px; border-radius: 4px; display: flex; align-items: center; }
        .alert.info { background: #e3f2fd; color: #1565c0; }
        .alert.error { background: #fce4ec; color: #c62828; }
        ::slotted(*) { margin: 0; }
      </style>
      <div class="alert ${this.getAttribute('type') || 'info'}">
        <slot name="icon">ℹ️</slot>
        <slot>Alert message</slot>
      </div>
    `;
  }
}

// ──── SLOTCHANGE EVENT ────
class DynamicList extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<slot></slot>`;
    
    const slot = shadow.querySelector('slot')!;
    slot.addEventListener('slotchange', () => {
      const items = slot.assignedElements();
      console.log(`${items.length} items projected`);
    });
  }
}
```

### Slot Types
| Type | Syntax | Purpose |
|---|---|---|
| **Default slot** | `<slot></slot>` | Catches unslotted content |
| **Named slot** | `<slot name="x">` | Specific projection point |
| **Fallback** | `<slot>Default</slot>` | Shown when no content projected |
| **::slotted()** | CSS pseudo-element | Style projected content |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Templates provide efficient HTML cloning (not re-parsed), slots enable content projection (like Angular's ng-content or React's children). Named slots allow multiple projection points. I use ::slotted() to style projected content and slotchange events for dynamic updates."*

## 4. 🧠 MEMORY AID
**"<template> = reusable, inert HTML (clone to use). <slot> = projection point. Named slot = targeted projection. ::slotted() = style projected content."**

## 5. 🎯 KEY INSIGHT
Templates are parsed but not rendered — they're in an "inert document fragment." This makes them more efficient than innerHTML for repeated element creation.
