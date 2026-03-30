# 355 – Custom Events & Component Communication

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Web components communicate via: **attributes** (parent → child), **Custom Events** (child → parent), and **properties** (JS API). CustomEvent with `bubbles: true, composed: true` crosses shadow DOM boundaries. For sibling communication, use an event bus or shared state.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── CUSTOM EVENTS (child → parent) ────
class TodoItem extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <div>
        <span>${this.getAttribute('text')}</span>
        <button id="del">Delete</button>
      </div>
    `;
    this.shadowRoot!.getElementById('del')!.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('todo-delete', {
        detail: { id: this.getAttribute('item-id') },
        bubbles: true,      // bubbles up through DOM tree
        composed: true,     // crosses shadow DOM boundaries
      }));
    });
  }
}

// Parent listens
document.querySelector('todo-list')!.addEventListener('todo-delete', ((e: CustomEvent) => {
  console.log('Delete item:', e.detail.id);
}) as EventListener);

// ──── ATTRIBUTES (parent → child) ────
class UserAvatar extends HTMLElement {
  static get observedAttributes() { return ['name', 'size', 'src']; }
  
  attributeChangedCallback(name: string, old: string, value: string) {
    this.render();
  }
  
  private render() {
    const name = this.getAttribute('name') || 'User';
    const size = this.getAttribute('size') || '40';
    this.shadowRoot!.innerHTML = `
      <img src="${this.getAttribute('src')}" alt="${name}" 
           width="${size}" height="${size}" style="border-radius: 50%;">
    `;
  }
}
// <user-avatar name="Hruday" size="48" src="/avatar.jpg"></user-avatar>

// ──── PROPERTIES (rich data via JS API) ────
class DataGrid extends HTMLElement {
  private _data: Record<string, unknown>[] = [];
  
  set data(value: Record<string, unknown>[]) {
    this._data = value;
    this.render();
  }
  get data() { return this._data; }
  
  private render() {
    // Render grid from this._data
  }
}
// JS: document.querySelector('data-grid').data = users;

// ──── EVENT BUS (sibling communication) ────
class EventBus {
  private static events = new Map<string, Set<Function>>();
  
  static on(event: string, handler: Function) {
    if (!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event)!.add(handler);
  }
  
  static emit(event: string, data?: unknown) {
    for (const handler of this.events.get(event) || []) {
      handler(data);
    }
  }
}
// Component A: EventBus.emit('theme-changed', 'dark');
// Component B: EventBus.on('theme-changed', (theme) => this.applyTheme(theme));
```

### Communication Patterns
| Direction | Mechanism |
|---|---|
| Parent → Child | Attributes (strings), Properties (rich data) |
| Child → Parent | CustomEvent with bubbles + composed |
| Sibling → Sibling | Event bus, shared state, or through parent |
| Any → Any | Custom event on document/window |

### `bubbles` + `composed`
| bubbles | composed | Behavior |
|---|---|---|
| false | false | Only target element |
| true | false | Bubbles but stops at shadow boundary |
| true | true | Bubbles through shadow DOM to document |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Parent→child via attributes/properties. Child→parent via CustomEvent with bubbles: true, composed: true to cross shadow boundaries. For sibling communication, I use an event bus or dispatch events on a shared ancestor. composed: true is critical for shadow DOM."*

## 4. 🧠 MEMORY AID
**"Down: attributes/properties. Up: CustomEvent(bubbles + composed). Sideways: event bus. composed = crosses shadow DOM."**

## 5. 🎯 KEY INSIGHT
Always use `composed: true` for custom events in web components — without it, events get trapped inside the shadow DOM and parents can't hear them.
