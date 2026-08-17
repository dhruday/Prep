# 352 – Custom Elements API

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Custom Elements let you define new HTML tags with encapsulated behavior. Two types: **autonomous** (`<my-button>` extends HTMLElement) and **customized built-in** (`<button is="my-button">` extends existing elements). Lifecycle: `constructor` → `connectedCallback` → `attributeChangedCallback` → `disconnectedCallback`.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── AUTONOMOUS CUSTOM ELEMENT ────
class MyCounter extends HTMLElement {
  private count = 0;
  private shadow: ShadowRoot;

  static get observedAttributes() { return ['initial']; }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Called when element is added to DOM
    this.render();
  }

  disconnectedCallback() {
    // Called when element is removed — cleanup listeners
    console.log('Counter removed from DOM');
  }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (name === 'initial') {
      this.count = parseInt(newVal) || 0;
      this.render();
    }
  }

  private render() {
    this.shadow.innerHTML = `
      <style>
        :host { display: inline-block; font-family: sans-serif; }
        button { padding: 8px 16px; cursor: pointer; }
        .count { font-size: 24px; margin: 0 12px; }
      </style>
      <button id="dec">-</button>
      <span class="count">${this.count}</span>
      <button id="inc">+</button>
    `;
    this.shadow.getElementById('inc')!.addEventListener('click', () => {
      this.count++;
      this.render();
      this.dispatchEvent(new CustomEvent('count-changed', { detail: this.count }));
    });
    this.shadow.getElementById('dec')!.addEventListener('click', () => {
      this.count--;
      this.render();
      this.dispatchEvent(new CustomEvent('count-changed', { detail: this.count }));
    });
  }
}

// Register the custom element
customElements.define('my-counter', MyCounter);

// Usage: <my-counter initial="5"></my-counter>
```

### Lifecycle
| Callback | When | Use For |
|---|---|---|
| `constructor()` | Element created | Init shadow DOM, state |
| `connectedCallback()` | Added to DOM | Render, add listeners, fetch data |
| `disconnectedCallback()` | Removed from DOM | Cleanup listeners, cancel requests |
| `attributeChangedCallback()` | Attribute changed | React to prop changes |
| `adoptedCallback()` | Moved to new document | Rare: iframe scenarios |

### Rules
- Tag name MUST contain a hyphen: `my-element`, not `myelement`
- Extend `HTMLElement` for autonomous elements
- Call `super()` first in constructor
- Don't add attributes/children in constructor — use `connectedCallback`

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Custom Elements API lets me define reusable HTML tags. I use connectedCallback for rendering, observedAttributes + attributeChangedCallback for reactive props, and CustomEvent for communication. At SAP, we built a shared component library using Custom Elements for cross-framework compatibility."*

## 4. 🧠 MEMORY AID
**"customElements.define('tag-name', Class). Lifecycle: constructor → connected → attributeChanged → disconnected. Tag must have hyphen."**

## 5. 🎯 KEY INSIGHT
Custom Elements are framework-agnostic — they work in React, Angular, Vue, or vanilla HTML. Perfect for shared component libraries in micro-frontend architectures.
