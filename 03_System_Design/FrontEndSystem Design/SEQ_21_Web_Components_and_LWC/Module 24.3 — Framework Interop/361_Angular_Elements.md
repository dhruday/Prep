# 361 – Angular Elements – Exporting as Web Components

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Angular Elements packages Angular components as Custom Elements (Web Components) that can be used in any HTML page or framework. It wraps an Angular component with `createCustomElement()`, handles change detection, and registers it via `customElements.define()`. Useful for embedding Angular components in non-Angular apps.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── ANGULAR COMPONENT ────
@Component({
  selector: 'app-greeting',
  template: `<h2>Hello, {{ name }}!</h2>
             <p>Count: {{ count }}</p>
             <button (click)="increment()">+</button>`,
})
export class GreetingComponent {
  @Input() name = 'World';
  count = 0;
  increment() { this.count++; }
  @Output() countChanged = new EventEmitter<number>();
}

// ──── EXPORT AS CUSTOM ELEMENT ────
// app.module.ts
import { createCustomElement } from '@angular/elements';

@NgModule({
  declarations: [GreetingComponent],
  imports: [BrowserModule],
})
export class AppModule {
  constructor(private injector: Injector) {
    const greetingElement = createCustomElement(GreetingComponent, { injector });
    customElements.define('ng-greeting', greetingElement);
  }

  ngDoBootstrap() {} // No bootstrap component — we're exporting elements
}
```

```html
<!-- Usage in ANY HTML page (no Angular needed) -->
<script src="ng-greeting.js"></script>
<ng-greeting name="Hruday"></ng-greeting>

<!-- In React -->
function App() {
  return <ng-greeting name="Hruday" />;
}

<!-- In Vue -->
<template>
  <ng-greeting :name="userName"></ng-greeting>
</template>
```

### Build as Standalone JS Bundle
```bash
# Build Angular Element as single file
ng build --configuration production
# Concatenate into one file using ngx-build-plus or custom webpack
# Result: single JS file that registers the custom element
```

### What Angular Elements Handles
| Feature | How |
|---|---|
| @Input → attributes | Auto-mapped (camelCase ↔ kebab-case) |
| @Output → CustomEvent | Auto-dispatched |
| Change detection | Zone.js or OnPush within element |
| Lifecycle | Maps to Custom Element lifecycle |
| DI | Injector passed at creation |

### Trade-offs
| Pro | Con |
|---|---|
| Framework-agnostic output | Angular runtime included (~100KB+) |
| Full Angular features inside | Zone.js overhead |
| Existing component reuse | Larger bundle than vanilla WC |
| DI, pipes, services work | Initial load cost |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Angular Elements wraps components as Custom Elements using createCustomElement(). @Input maps to attributes, @Output to CustomEvents. At SAP, we used this to embed Angular dashboard widgets into a Fiori Launchpad that wasn't built with Angular. The trade-off is including Angular's runtime."*

## 4. 🧠 MEMORY AID
**"createCustomElement(Component, { injector }) → customElements.define('tag', element). @Input = attributes, @Output = CustomEvents. Includes Angular runtime."**

## 5. 🎯 KEY INSIGHT
Angular Elements is ideal for migration strategies — wrap existing Angular components for use in a React/Vue app during gradual migration.
