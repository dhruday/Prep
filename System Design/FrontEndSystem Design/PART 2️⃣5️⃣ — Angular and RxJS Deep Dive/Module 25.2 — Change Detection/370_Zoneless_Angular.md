# 370 – Zoneless Angular – Signal-Based Reactivity

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Zoneless Angular** removes zone.js entirely. Instead, Angular uses **Signals** for fine-grained reactivity — only components that read changed signals get re-rendered. No monkey-patching, smaller bundles, better performance. Available experimentally in Angular 17+, production-ready path in v18+.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── ENABLING ZONELESS ────
// main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection(), // Angular 17+
    provideRouter(routes),
    provideHttpClient(),
  ],
});

// ──── SIGNALS-BASED COMPONENT ────
@Component({
  selector: 'app-counter',
  standalone: true,
  template: `
    <div>Count: {{ count() }}</div>
    <div>Double: {{ doubled() }}</div>
    <button (click)="increment()">+1</button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterComponent {
  // signal — writable reactive primitive
  count = signal(0);
  
  // computed — derived signal (auto-tracks dependencies)
  doubled = computed(() => this.count() * 2);
  
  increment() {
    this.count.update(c => c + 1); // triggers re-render of THIS component only
  }
}

// ──── SIGNALS API ────
// signal(initialValue) — create writable signal
const name = signal('Hruday');
name.set('Updated');           // replace value
name.update(n => n + '!');     // update based on current

// computed(() => expr) — derived, auto-tracks
const greeting = computed(() => `Hello, ${name()}`);

// effect(() => {...}) — side effect on signal change
effect(() => {
  console.log(`Name changed to: ${name()}`);
  // Runs whenever name() changes
});

// ──── SIGNAL INPUTS (Angular 17.1+) ────
@Component({
  selector: 'app-user-card',
  standalone: true,
  template: `<h2>{{ fullName() }}</h2>`,
})
export class UserCardComponent {
  // Signal-based input (replaces @Input())
  firstName = input.required<string>();
  lastName = input<string>('');
  
  fullName = computed(() => `${this.firstName()} ${this.lastName()}`);
}

// ──── SIGNAL QUERIES (Angular 17.2+) ────
@Component({ /* ... */ })
export class FormComponent {
  nameInput = viewChild<ElementRef>('nameInput');  // replaces @ViewChild
  items = viewChildren(ItemComponent);              // replaces @ViewChildren
}

// ──── RxJS INTEROP ────
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

@Component({ /* ... */ })
export class DataComponent {
  // Observable → Signal
  users = toSignal(this.http.get<User[]>('/api/users'), { initialValue: [] });
  
  // Signal → Observable
  searchTerm = signal('');
  searchTerm$ = toObservable(this.searchTerm);
}
```

### Zone.js vs Zoneless
| Feature | Zone.js | Zoneless (Signals) |
|---|---|---|
| **CD trigger** | Async patches | Signal changes |
| **Granularity** | Component tree | Individual component |
| **Bundle** | +100KB zone.js | No zone.js |
| **3rd party** | May cause extra CD | Predictable |
| **Debugging** | Complex zone traces | Clear data flow |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Zoneless Angular replaces zone.js with Signals for fine-grained reactivity. signal() for state, computed() for derived values, effect() for side effects. Only components reading changed signals re-render. I use toSignal/toObservable for RxJS interop. This is Angular's future — smaller bundles, predictable performance."*

## 4. 🧠 MEMORY AID
**"Zoneless = no zone.js. signal() = state. computed() = derived. effect() = side effect. toSignal() / toObservable() bridge RxJS ↔ Signals."**
