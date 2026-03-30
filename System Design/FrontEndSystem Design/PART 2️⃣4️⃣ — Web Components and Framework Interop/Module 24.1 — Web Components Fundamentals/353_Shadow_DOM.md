# 353 – Shadow DOM – Open vs Closed Mode

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Shadow DOM provides **style and DOM encapsulation** for web components. Styles inside Shadow DOM don't leak out; external styles don't leak in. **Open mode**: `element.shadowRoot` is accessible from outside. **Closed mode**: `shadowRoot` returns null — fully encapsulated. Open mode is recommended for most use cases.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── OPEN SHADOW DOM ────
class OpenComponent extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        /* These styles ONLY apply inside this shadow root */
        p { color: red; font-weight: bold; }
        /* :host styles the custom element itself */
        :host { display: block; border: 1px solid #ccc; padding: 16px; }
        /* :host() with selector */
        :host(.dark) { background: #333; color: white; }
      </style>
      <p>I'm encapsulated! External p { color: blue } won't affect me.</p>
    `;
  }
}
// document.querySelector('open-component').shadowRoot // ✅ accessible

// ──── CLOSED SHADOW DOM ────
class ClosedComponent extends HTMLElement {
  private shadow: ShadowRoot;
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'closed' });
    this.shadow.innerHTML = `<p>Hidden shadow DOM</p>`;
  }
}
// document.querySelector('closed-component').shadowRoot // null ❌

// ──── STYLING HOOKS (CSS Custom Properties) ────
class ThemeableCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        .card {
          /* CSS variables pierce shadow DOM — theming! */
          background: var(--card-bg, white);
          color: var(--card-color, #333);
          border-radius: var(--card-radius, 8px);
          padding: var(--card-padding, 16px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
      </style>
      <div class="card">
        <slot></slot>
      </div>
    `;
  }
}
// External CSS: themeable-card { --card-bg: #1a1a2e; --card-color: white; }
```

### Open vs Closed
| Aspect | Open | Closed |
|---|---|---|
| `el.shadowRoot` | Returns ShadowRoot | Returns null |
| Framework access | ✅ Frameworks can inspect | ❌ No access |
| Testing | ✅ Easy to test | ❌ Hard to test |
| DevTools | ✅ Visible | ❌ Still visible in DevTools |
| Security | Not a security boundary | Not a security boundary |
| Use case | 99% of cases | Browser internals (video controls) |

### Style Encapsulation
| Direction | Behavior |
|---|---|
| **External → Shadow** | Blocked (except CSS variables and inheritable props) |
| **Shadow → External** | Blocked (styles stay inside) |
| **CSS Variables** | Pierce through (for theming) |
| **::part()** | Explicit external styling of specific parts |

```typescript
// ::part() for selective external styling
shadow.innerHTML = `
  <style>button { padding: 8px 16px; }</style>
  <button part="action-btn">Click Me</button>
`;
// External CSS: my-component::part(action-btn) { background: blue; }
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Shadow DOM provides style encapsulation — no style leaking in or out. I use open mode (closed provides no real security benefit and makes testing harder). For theming, CSS custom properties pierce the shadow boundary. For selective styling, I expose parts via the part attribute."*

## 4. 🧠 MEMORY AID
**"Open = accessible shadowRoot. Closed = null. CSS vars pierce shadow. ::part() for external styling. Style encapsulation ≠ security."**

## 5. 🎯 KEY INSIGHT
Shadow DOM is not a security boundary — it's a style/DOM boundary. Use it for encapsulation, not protection.
