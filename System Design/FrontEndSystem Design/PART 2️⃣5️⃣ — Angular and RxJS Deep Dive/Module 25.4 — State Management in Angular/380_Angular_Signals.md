# 380 – Angular Signals (v17+) – signal(), computed(), effect()

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Angular Signals** are fine-grained reactive primitives. `signal()` creates writable state, `computed()` derives values (auto-tracks dependencies, memoized), `effect()` runs side effects when signals change. Signals enable zoneless change detection, simpler mental model than RxJS for component state.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── signal() — writable reactive value ────
const count = signal(0);
console.log(count());        // 0 — read by calling

count.set(5);                 // replace value
count.update(c => c + 1);    // update from current (6)

// Equality check (skip updates if same)
const user = signal({ name: 'Hruday' }, { equal: (a, b) => a.name === b.name });

// ──── computed() — derived, auto-tracking, memoized ────
const firstName = signal('Hruday');
const lastName = signal('Mittapally');

const fullName = computed(() => `${firstName()} ${lastName()}`);
// Auto-tracks: recalculates when firstName or lastName changes
// Memoized: returns cached value if deps haven't changed

console.log(fullName()); // 'Hruday Mittapally'
firstName.set('H');
console.log(fullName()); // 'H Mittapally'

// Computed from other computed
const greeting = computed(() => `Hello, ${fullName()}!`);

// ──── effect() — side effects ────
// Runs when any read signal changes
effect(() => {
  console.log(`Count is now: ${count()}`);
  // Automatically re-runs when count changes
});

// effect with cleanup
effect((onCleanup) => {
  const id = setInterval(() => console.log(count()), 1000);
  onCleanup(() => clearInterval(id)); // cleanup on re-run or destroy
});

// ──── COMPONENT EXAMPLE ────
@Component({
  standalone: true,
  template: `
    <input [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)" />
    <div>Results: {{ filteredItems().length }}</div>
    <div *ngFor="let item of filteredItems()">{{ item.name }}</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  items = signal<Item[]>([]);
  searchTerm = signal('');
  
  filteredItems = computed(() =>
    this.items().filter(item =>
      item.name.toLowerCase().includes(this.searchTerm().toLowerCase()),
    ),
  );

  constructor() {
    // Load data
    inject(HttpClient).get<Item[]>('/api/items').subscribe(data => {
      this.items.set(data);
    });
    
    // Log analytics on search
    effect(() => {
      const term = this.searchTerm();
      if (term.length > 2) {
        inject(AnalyticsService).trackSearch(term);
      }
    });
  }
}

// ──── SIGNALS IN SERVICES ────
@Injectable({ providedIn: 'root' })
export class CartService {
  private items = signal<CartItem[]>([]);
  
  readonly cartItems = this.items.asReadonly(); // expose read-only
  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.qty, 0),
  );
  readonly itemCount = computed(() => this.items().length);
  
  addItem(item: CartItem) {
    this.items.update(items => [...items, item]);
  }
  
  removeItem(id: string) {
    this.items.update(items => items.filter(i => i.id !== id));
  }
}

// ──── RxJS INTEROP ────
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

// Observable → Signal
const users = toSignal(this.http.get<User[]>('/api/users'), { initialValue: [] });

// Signal → Observable
const searchTerm = signal('');
const searchTerm$ = toObservable(searchTerm);
```

### Signals vs RxJS
| Aspect | Signals | RxJS |
|---|---|---|
| **Mental model** | Synchronous reads | Async streams |
| **Use for** | Component state, derived values | Async flows, events, HTTP |
| **Change detection** | Fine-grained (per signal) | Zone.js / async pipe |
| **Learning curve** | Easy | Steep |
| **Interop** | toSignal / toObservable | Native |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Signals are Angular's fine-grained reactivity: signal() for state, computed() for memoized derived values, effect() for side effects. They enable zoneless CD — only components reading changed signals re-render. I use toSignal/toObservable for RxJS interop. Signals for sync state, RxJS for async streams."*

## 4. 🧠 MEMORY AID
**"signal() = writable state. computed() = derived + memoized. effect() = side effect. Read: signal(). Write: set/update. toSignal bridges RxJS."**
