# 177. Angular OnPush + trackBy Performance Patterns
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"Angular's default change detection checks every component in the tree on every browser event — a click anywhere triggers a full top-down traversal of the component tree. In a complex enterprise app with 300+ components, this can take 80–120ms per event, making the app feel sluggish. OnPush change detection is the solution: a component with OnPush only re-renders when its input references change, an event fires inside the component, or an async pipe resolves. Angular completely skips its subtree otherwise. At SAP, migrating our 47-component product list module from default change detection to OnPush reduced event processing time from 95ms to 12ms — that's 8× improvement in responsiveness. `trackBy` is the companion optimization for `*ngFor`: without it, Angular destroys and re-creates every DOM element when an array reference changes, even if the data is identical. With `trackBy: trackById`, Angular matches existing DOM elements by their identity and only creates/destroys elements that actually changed. On a 200-row table receiving backend updates, this reduced DOM mutations from 200 per update to 2–5 per update."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Angular Change Detection: Default vs OnPush

**Default Change Detection (ChangeDetectionStrategy.Default):**
```
Browser event fires (click, timer, XHR callback, Promise)
  → Zone.js intercepts
  → Angular triggers change detection
  → Traverses EVERY component in the tree top-down
  → Checks EVERY binding in EVERY component
  → Updates DOM for any changed values

Cost: O(total bindings in app) per browser event
With 300 components × 10 bindings avg = 3,000 checks per click
```

**OnPush Change Detection:**
```
Browser event fires
  → Zone.js intercepts
  → Angular traverses tree, but...
  → Skips any OnPush component subtree UNLESS:
    (a) An @Input() reference changed (Object.is check)
    (b) An event fired inside this component or its children
    (c) async pipe or Signal resolves inside this component
    (d) markForCheck() / detectChanges() called explicitly

Cost: O(changed subtrees × their bindings) per browser event
With OnPush on 80% of components: ~300 checks per click (10× less)
```

### Implementing OnPush

```typescript
import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
} from '@angular/core';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

@Component({
  selector: 'app-product-card',
  template: `
    <div class="card">
      <h3>{{ product.name }}</h3>
      <p>{{ product.category }}</p>
      <strong>{{ product.price | currency }}</strong>
      <button (click)="onAddToCart()">Add to Cart</button>
    </div>
  `,
  // OnPush: this component only re-renders when:
  // 1. product @Input changes reference
  // 2. user clicks a button inside this component
  // 3. an async pipe resolves
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;

  onAddToCart(): void {
    // Event fires inside this component → Angular marks it dirty → re-renders
    console.log('Adding to cart:', this.product.id);
  }
}
```

### The OnPush Trap: Mutating Input Objects

```typescript
// ❌ BUG: mutating the object doesn't change its reference
// OnPush will NOT detect this change

// In parent component:
updateProductPrice(product: Product, newPrice: number): void {
  product.price = newPrice; // ← mutating the same object reference
  // Angular OnPush checks: prev ref === next ref → true → SKIPS. Old price shown!
}

// ✅ CORRECT: always create new object reference
updateProductPrice(product: Product, newPrice: number): void {
  const updatedProduct = { ...product, price: newPrice }; // new reference
  this.products = this.products.map(p =>
    p.id === product.id ? updatedProduct : p
  );
  // Angular OnPush: prev ref !== next ref → re-renders. New price shown!
}
```

### markForCheck() vs detectChanges()

Both force OnPush components to update, but at different granularity:

```typescript
@Component({
  selector: 'app-live-data',
  template: `<div>{{ latestValue }}</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveDataComponent implements OnInit {
  latestValue: string = 'Loading...';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // WebSocket or external event source — NOT going through Angular's zone
    this.externalDataService.stream$.pipe(
      // takeUntilDestroyed (Angular 16+) for automatic cleanup
    ).subscribe(data => {
      this.latestValue = data;

      // markForCheck(): marks this component AND all ancestors as dirty
      // → Angular will check them all on next change detection cycle
      // Use when: updating a value and next CD cycle is acceptable
      this.cdr.markForCheck();

      // vs detectChanges(): triggers CD immediately for this component and its subtree
      // Use when: you need synchronous DOM update (e.g., after user gesture)
      // this.cdr.detectChanges();
    });
  }
}
```

**When to use which:**
```
markForCheck()    → data update from outside Angular zone
                  → async observable in subscription
                  → WebSocket, setInterval outside zone
                  → Use 99% of the time

detectChanges()   → synchronous unit test assertions
                  → after triggering animation that reads DOM
                  → rare production cases needing immediate DOM sync
```

### Angular Signals (Angular 16+ / 17+) — The Future of All This

Signals make OnPush + markForCheck() mostly unnecessary by making change detection granular by default:

```typescript
import { Component, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-product-list-signal',
  template: `
    <p>Total products: {{ totalCount() }}</p>
    <p>Active: {{ activeCount() }}</p>

    @for (product of activeProducts(); track product.id) {
      <app-product-card [product]="product" />
    }
  `,
  // OnPush still recommended with signals — signals tell Angular exactly
  // which component to update without scanning the whole tree
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListSignalComponent {
  // Signal: writable reactive value
  products = signal<Product[]>([]);

  // Computed: auto-memoized derived signal — recalculates only when products changes
  totalCount = computed(() => this.products().length);
  activeCount = computed(() => this.products().filter(p => p.active).length);
  activeProducts = computed(() => this.products().filter(p => p.active));

  // Update: immutably — signals track reference, not deep equality
  addProduct(product: Product): void {
    this.products.update(current => [...current, product]); // new array reference
  }

  updatePrice(id: string, price: number): void {
    this.products.update(current =>
      current.map(p => p.id === id ? { ...p, price } : p) // new object reference
    );
  }
}
```

### trackBy in *ngFor

```typescript
// Without trackBy:
// When products array reference changes (new fetch, sort, filter):
// Angular destroys ALL 200 DOM elements, creates 200 new ones
// Even if 198 products are identical
<div *ngFor="let product of products">
  <app-product-card [product]="product" />
</div>

// With trackBy:
// Angular uses product.id to match existing DOM elements to updated data
// If product.id already exists: UPDATE the existing DOM element (cheap)
// If product.id is new: CREATE a new DOM element
// If product.id is gone: DESTROY that DOM element
// For a 200-row update where 2 products changed: 2 operations, not 200
<div *ngFor="let product of products; trackBy: trackById">
  <app-product-card [product]="product" />
</div>
```

```typescript
@Component({
  selector: 'app-product-list',
  template: `
    <div *ngFor="let product of products; trackBy: trackById; index as i">
      <app-product-card
        [product]="product"
        [index]="i"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent {
  @Input({ required: true }) products: Product[] = [];

  // trackBy function: must return a UNIQUE, STABLE identifier
  // Called for every item in the array on every change detection
  // Must be cheap — no side effects, no HTTP calls
  trackById(_index: number, product: Product): string {
    return product.id; // stable identity — doesn't change when price changes
  }

  // Alternative approaches:
  // trackByIndex = (index: number) => index;   // simple but loses reuse benefit
  // trackByIdAndName = (i: number, p: Product) => `${p.id}-${p.name}`; // composite
}
```

### Angular 17+ @for with track

The new `@for` block syntax makes `trackBy` mandatory rather than optional (which is good!):

```typescript
@Component({
  template: `
    @for (product of products; track product.id) {
      <app-product-card [product]="product" />
    } @empty {
      <p>No products found</p>
    }
  `
})
export class ModernProductListComponent {
  @Input() products: Product[] = [];
}
```

### Full Performance-Optimized Component Pattern

```typescript
import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, TrackByFunction, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="grid">
      @for (product of visibleProducts; track product.id) {
        <div
          class="card"
          [class.selected]="selectedId === product.id"
          (click)="select(product.id)"
        >
          <img
            [src]="product.thumbnail"
            [alt]="product.name"
            loading="lazy"
            width="200"
            height="200"
          />
          <h3>{{ product.name }}</h3>
          <span>{{ product.price | currency }}</span>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGridComponent implements OnChanges {
  @Input({ required: true }) products: Product[] = [];
  @Input() filterText = '';
  @Input() selectedId: string | null = null;
  @Output() productSelected = new EventEmitter<string>();

  // Pre-computed in ngOnChanges rather than in template (template runs on every CD)
  visibleProducts: Product[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    // Only recalculate if relevant inputs changed
    if (changes['products'] || changes['filterText']) {
      const text = this.filterText.toLowerCase();
      this.visibleProducts = text
        ? this.products.filter(p => p.name.toLowerCase().includes(text))
        : this.products;
    }
  }

  select(id: string): void {
    this.productSelected.emit(id);
  }
}
```

### Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Calling functions in template `{{ getLabel(item) }}` | Function called every CD | Pre-compute in `ngOnChanges`, or use pure pipe |
| `async` pipe without `<ng-container>` wrapper | Multiple subscriptions | Wrap in `<ng-container *ngIf="data$ \| async as data">` |
| Complex template expressions `{{ a + b * c \| currency }}` | Evaluated every CD | `computed()` signal or `ngOnChanges` |
| Missing `trackBy`/`track` on dynamic lists | Full DOM re-creation on any update | Always add `trackBy`/`track` |
| Mutating @Input() objects with OnPush | View not updated | Always create new references |
| `detectChanges()` in business logic | Tight coupling to CD mechanism | Use signals or `markForCheck()` |
| OnPush without immutable state patterns | Random stale UI bugs | Adopt immutable update patterns in state management |

---

## 🌍 3. Real-World Examples

### SAP — Module OnPush Migration: 95ms → 12ms
SAP product list had 47 components in its subtree, all with default change detection. A single filter panel keystroke triggered 3,000+ binding checks. Chrome DevTools showed 95ms for change detection per keystroke, making the filter feel laggy. Hruday led the migration to OnPush across all 47 components (requiring immutable updates throughout the NgRx store reducers). The migration took one sprint — 3 days of work. After migration: 95ms → 12ms per change detection cycle. The filter became instant-feeling.

### Bosch — Real-Time IoT Dashboard
Bosch connected device dashboard displayed 500+ sensors updating every 2 seconds via WebSocket. Default change detection caused 100% CPU usage on mid-range laptops — the app was effectively unusable. After OnPush migration: only the 5–10 sensor tiles whose values changed triggered re-renders. CPU dropped from 100% to 8% on the same hardware. `markForCheck()` was called inside the WebSocket subscription after each value update.

### Salesforce LWC — Track Property
Salesforce Lightning Web Components use a `track` decorator (before LWC went to reactive by default) similar to Angular's `trackBy`. Salesforce's internal documentation specifies: "Always use `trackBy` on `lightning-datatable` or your table may re-render all rows on every update, causing visible flicker in list views." This is baked into Salesforce's official performance guidelines.

---

## 💼 4. Interview Execution

### Sample Answer (2 minutes)

> "Angular's default change detection traverses every component in the app tree on every browser event. With OnPush, Angular skips a component's subtree unless its @Input() references change, an event fires inside it, or an async pipe resolves. This transforms change detection from O(all components) to O(components that actually changed). The key constraint with OnPush is referential immutability: you cannot mutate an @Input() object's properties — you must create a new object reference. This naturally pairs well with NgRx and immutable reducers. `trackBy` is the complement for `*ngFor` — without it, Angular destroys and re-creates all DOM elements when the array changes, even if 198 out of 200 items are identical. With `trackBy: trackById`, Angular reconciles by identity: update what changed, create what's new, remove what's gone. Angular 17's `@for` syntax makes `track` mandatory, eliminating this common oversight. In Angular 17+ I prefer using Signals with OnPush — Signals tell Angular exactly which component needs updating without any manual `markForCheck()` calls."

### Follow-Up Q&A

**Q: If a WebSocket sends data outside Angular's zone, does OnPush still work?**
A: Not automatically. Zone.js intercepts known async APIs (`setTimeout`, `Promise`, XHR/fetch, `addEventListener`) and triggers Angular's change detection. But WebSocket's `onmessage` is zone-patched in most setups. If using a custom WebSocket wrapper or `runOutsideAngular()` for performance, you must explicitly call `this.cdr.markForCheck()` after updating component state from the message handler. This is the most common OnPush bug in real-time apps: data arrives, state updates, but view doesn't update because Zone.js wasn't involved.

**Q: How do you migrate an existing app to OnPush incrementally?**
A: Leaf-first strategy: start with the deepest, simplest components (pure display components with no children), add `ChangeDetectionStrategy.OnPush`, then test in Angular DevTools. Work up the tree. Use Angular DevTools' "Change Detection" tab — it highlights which components triggered in the last change detection cycle, making it easy to find components that re-render when they shouldn't. The blocker is usually function calls in templates (`{{ getDisplayName(user) }}`): these must be replaced with pure pipes or computed values before OnPush is safe.

---

## 💻 5. Code Example (TypeScript)

```typescript
// Angular Signals + OnPush: Zero-boilerplate reactive component

import {
  Component, signal, computed, effect, inject, DestroyRef
} from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

interface SensorReading {
  id: string;
  label: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
}

@Component({
  selector: 'app-sensor-dashboard',
  standalone: true,
  template: `
    <div class="header">
      <h2>Sensors ({{ totalCount() }}/{{ criticalCount() }} critical)</h2>
      <input
        type="text"
        [value]="searchQuery()"
        (input)="searchQuery.set($any($event.target).value)"
        placeholder="Filter sensors..."
      />
    </div>

    @for (sensor of filteredSensors(); track sensor.id) {
      <div class="sensor-tile" [class]="'status-' + sensor.status">
        <span class="label">{{ sensor.label }}</span>
        <strong class="value">{{ sensor.value | number:'1.1-1' }} {{ sensor.unit }}</strong>
        <span class="badge">{{ sensor.status }}</span>
      </div>
    } @empty {
      <p>No sensors match "{{ searchQuery() }}"</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush, // still recommended with Signals
})
export class SensorDashboardComponent {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  // Writable signals
  sensors = signal<SensorReading[]>([]);
  searchQuery = signal('');

  // Computed signals: auto-memoized, only recalculate when dependencies change
  filteredSensors = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return q
      ? this.sensors().filter(s => s.label.toLowerCase().includes(q))
      : this.sensors();
  });

  totalCount = computed(() => this.sensors().length);

  criticalCount = computed(() =>
    this.sensors().filter(s => s.status === 'critical').length
  );

  constructor() {
    // Load initial data
    this.http.get<SensorReading[]>('/api/sensors').pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => {
      this.sensors.set(data); // signals trigger targeted re-render — no markForCheck needed
    });

    // Simulate real-time updates (WebSocket in production)
    this.startLiveUpdates();

    // Effect: runs once on init and whenever criticalCount changes
    // Used for side effects (logging, notifications) — not for rendering
    effect(() => {
      const critical = this.criticalCount();
      if (critical > 0) {
        console.warn(`[SensorDashboard] ${critical} critical sensor(s)`);
      }
    });
  }

  private startLiveUpdates(): void {
    // In production: replace with WebSocket subscription
    const interval = setInterval(() => {
      this.sensors.update(current =>
        current.map(sensor => ({
          ...sensor, // new object reference — OnPush detects the change
          value: sensor.value + (Math.random() - 0.5) * 2,
          status: sensor.value > 95 ? 'critical'
                : sensor.value > 80 ? 'warning'
                : 'normal',
        }))
      );
    }, 2000);

    this.destroyRef.onDestroy(() => clearInterval(interval));
  }
}
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"OITM"**
- **O** — OnPush (only re-render on input reference change, event, or async pipe)
- **I** — Immutability (always create new object references — mutating skips CD)
- **T** — trackBy / track (match DOM elements by identity, not array index)
- **M** — markForCheck (for out-of-zone updates) vs Signals (no markForCheck needed)

### OnPush Three Triggers (must memorize)
```
A component with OnPush re-renders ONLY when:
1. @Input() reference changes     (Object.is check)
2. Event fires INSIDE the component (click, input, etc.)
3. async pipe resolves             (or signal changes in Angular 16+)

Explicitly forced by:
4. markForCheck()    — mark dirty for next CD cycle
5. detectChanges()   — run CD immediately for this subtree
```

### Analogy
Default change detection is like a **building inspector** who checks every apartment in the building after any noise complaint, regardless of which floor the noise came from. OnPush is like installing a buzzer system — the inspector only checks apartments where a buzzer was pressed (input changed, event fired). The total inspection time drops from O(apartments) to O(buzzers pressed).

---

## ✅ 7. Why & How Summary

- **Why it matters:** Default change detection checks every binding in every component on every browser event; in a 300-component enterprise app this takes 80–120ms per event — slow enough to cause visible input lag; OnPush reduces this to only changed subtrees, achieving 8× improvement at SAP (95ms → 12ms)
- **How it works:** `ChangeDetectionStrategy.OnPush` instructs Angular's change detector to skip a component's subtree unless its @Input references change (by reference equality), an event fires inside the component, async pipe resolves, or `markForCheck()`/`detectChanges()` is called explicitly; `trackBy`/`track` prevents DOM recreation by giving Angular a stable identity to reconcile array items by
- **How Hruday uses it:** OnPush on all components by default at SAP/Bosch; immutable NgRx reducers to ensure new references; Signals with `computed()` for derived state; `trackBy: trackById` on every `*ngFor`; Angular 17 `@for` with `track product.id` going forward

---

✅ Topic 177/486 complete → Continuing to Topic 178: Main Thread Scheduling
