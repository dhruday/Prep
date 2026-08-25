# 108. Angular OnPush + trackBy Performance Patterns

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

Angular's default change detection checks every component in the tree on every event — mouse moves, keystrokes, HTTP responses, timers. For an app with 200 components, this is 200 dirty checks per interaction, regardless of whether those components' data actually changed. **`ChangeDetectionStrategy.OnPush`** is Angular's opt-in mechanism to skip a component's subtree unless its `@Input()` references change, a bound event fires within it, or it's manually triggered via `ChangeDetectorRef`. Combined with **`trackBy`** on `ngFor` (which prevents DOM recycling on list reorders), these two patterns are the foundation of high-performance Angular applications. At SAP, at Bosch, and across the enterprise Angular ecosystem, every performance-sensitive component should be `OnPush` by default — this is the single highest-impact optimization available in Angular, and it's free.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Angular's Change Detection Model

```
Default Strategy (Check Always):
─────────────────────────────────
Event/Timer/HTTP → Zone.js → triggerChangeDetection()
                                  ↓
                    Check ALL components top-to-bottom
                    (200 components × ~0.15ms = 30ms per event)

OnPush Strategy:
─────────────────────────────────
Event/Timer/HTTP → Zone.js → triggerChangeDetection()
                                  ↓
                    Check component only if:
                    1. @Input() reference changed
                    2. Event originated from this component/child
                    3. Async pipe resolved (marks component dirty)
                    4. markForCheck() / detectChanges() called manually
                    
Result: 200 components, 180 with OnPush, only 20 checked → ~3ms
```

### OnPush: Correct Implementation

```typescript
// ✅ Component with OnPush — correct patterns
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { Observable } from 'rxjs';
import { ProductService } from './product.service';
import type { Product } from './product.model';

@Component({
  selector: 'app-product-card',
  template: `
    <div class="card">
      <h3>{{ product.name }}</h3>
      <span>{{ product.price | currency }}</span>
      
      <!-- async pipe auto-marks component dirty on emission -->
      <div *ngIf="discount$ | async as discount">
        Discount: {{ discount }}%
      </div>
      
      <!-- Event in this component → Angular checks this subtree -->
      <button (click)="addToCart()">Add to Cart</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,  // ← THE KEY LINE
})
export class ProductCardComponent implements OnInit {
  @Input() product!: Product;   // OnPush checks when reference changes
  
  discount$!: Observable<number>;
  
  constructor(
    private productService: ProductService,
    private cdr: ChangeDetectorRef,    // Manual control when needed
  ) {}
  
  ngOnInit(): void {
    this.discount$ = this.productService.getDiscount(this.product.id);
    // async pipe handles subscription + markForCheck()
  }
  
  addToCart(): void {
    // Event handler — Angular will check this component tree
    // No need for markForCheck() here
  }
  
  // Example: imperative update from a callback (e.g., WebSocket)
  onExternalPriceUpdate(newProduct: Product): void {
    // ❌ WRONG: Mutating the same object reference — OnPush won't detect this!
    // this.product.price = newProduct.price;

    // ✅ CORRECT: Replace the reference
    this.product = { ...this.product, price: newProduct.price };
    this.cdr.markForCheck();  // Tell Angular: re-check this component next cycle
  }
}
```

### The Immutability Contract of OnPush

```typescript
// OnPush ONLY detects @Input() changes by reference
// This means parent code must follow immutability patterns

// ❌ WRONG — parent mutates array, same reference → OnPush child never updates
export class ProductListComponent {
  products: Product[] = [];
  
  onNewProduct(product: Product): void {
    this.products.push(product);              // Same array reference
    // ProductCardComponent with OnPush sees: "same array" → skip ❌
  }
}

// ✅ CORRECT — parent creates new array reference
export class ProductListComponent {
  products: Product[] = [];
  
  onNewProduct(product: Product): void {
    this.products = [...this.products, product];  // New array reference
    // ProductCardComponent sees: "new array" → re-render ✅
  }
}

// ─────────────────────────────────────────────
// NgRx / Signals: guarantee immutability
// NgRx reducers always return new state objects → OnPush works perfectly
// Angular Signals: always produce new value reference on .set() or .update()
```

### trackBy: Preventing Unnecessary DOM Destruction

```typescript
// WITHOUT trackBy — Angular destroys and recreates all DOM nodes on any list change
// ❌ Default ngFor behavior
@Component({
  template: `
    <div *ngFor="let product of products">
      {{ product.name }}
    </div>
    <!-- On any products change: ALL DOM nodes destroyed and recreated -->
    <!-- 1000 products re-sorted = 1000 DOM deletions + 1000 DOM insertions -->
  `
})

// ✅ WITH trackBy — Angular identifies nodes by key, only updates changed nodes
@Component({
  selector: 'app-product-list',
  template: `
    <div *ngFor="let product of products; trackBy: trackByProductId">
      <app-product-card [product]="product" />
    </div>
    <!-- On re-sort: DOM nodes MOVE, not recreated. -->
    <!-- On add: only new item's DOM node is created. -->
    <!-- On remove: only removed item's node is destroyed. -->
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent {
  @Input() products: Product[] = [];
  
  // trackBy function — must be PURE (no side effects)
  // Returns a unique identifier for each item
  trackByProductId(_index: number, product: Product): string {
    return product.id;
  }
  
  // ❌ ANTI-PATTERN: Using index as trackBy key
  // trackByIndex(index: number): number { return index; }
  // If item 0 is deleted, all remaining items shift → all DOM nodes recreated anyway
}
```

### When trackBy Makes a Measurable Difference

| List Size | Without trackBy (re-sort) | With trackBy (re-sort) |
|---|---|---|
| 10 items | ~2ms | ~0.1ms |
| 100 items | ~20ms | ~1ms |
| 500 items | ~100ms | ~5ms |
| 1000 items | ~200ms+ (janky!) | ~10ms |

### ChangeDetectorRef: Manual Control

```typescript
import { ChangeDetectorRef, Component, NgZone, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-live-ticker',
  template: `
    <span>Price: {{ currentPrice | currency }}</span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveTickerComponent implements OnInit, OnDestroy {
  currentPrice = 0;
  private ws!: WebSocket;
  
  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}
  
  ngOnInit(): void {
    // WebSocket is OUTSIDE Angular Zone — no automatic change detection
    this.ngZone.runOutsideAngular(() => {
      this.ws = new WebSocket('wss://prices.example.com');
      this.ws.onmessage = (event) => {
        this.currentPrice = JSON.parse(event.data).price;
        
        // Option 1: markForCheck() — schedules check in next Angular CD cycle
        // Use when many rapid updates possible (throttled via WebSocket)
        this.cdr.markForCheck();
        
        // Option 2: detectChanges() — synchronously runs CD on this component
        // Use sparingly — bypasses batching
        // this.cdr.detectChanges();
      };
    });
  }
  
  ngOnDestroy(): void {
    this.ws?.close();
    // Important: detach from CD tree if component becomes inactive
    // this.cdr.detach();
  }
}
```

### Angular Signals (Angular 16+): The Future of Change Detection

```typescript
// Angular Signals make OnPush even more powerful
// Signals are reactive — they automatically mark only affected components dirty
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-product',
  template: `
    <h3>{{ product().name }}</h3>
    <span>{{ formattedPrice() }}</span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductComponent {
  product = signal<Product>({ id: '1', name: 'Widget', price: 9.99 });
  
  // Computed signal — only recalculates when product() changes
  formattedPrice = computed(() => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
      .format(this.product().price)
  );
  
  updatePrice(newPrice: number): void {
    // Signal update: Angular knows EXACTLY which template expressions depend on this signal
    // Only those expressions re-evaluate — not the entire component
    this.product.update(p => ({ ...p, price: newPrice }));
  }
}
```

### The Full Pattern Stack (Enterprise Production)

```typescript
// Production-grade Angular performance pattern combining all techniques:

@Component({
  selector: 'app-dashboard',
  template: `
    <!-- trackBy on all lists -->
    <app-widget
      *ngFor="let widget of widgets$ | async; trackBy: trackById"
      [data]="widget"      <!-- @Input by reference — OnPush compatible -->
      [config]="widgetConfig"  <!-- Stable reference (not inline object!) -->
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  // async pipe manages subscription + markForCheck() automatically
  widgets$ = this.store.select(selectDashboardWidgets);
  
  // ✅ Stable config reference (not new object every render)
  widgetConfig = { theme: 'dark', density: 'comfortable' } as const;
  
  constructor(private store: Store) {}
  
  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
```

### Anti-Patterns

- **Using `ChangeDetectorRef.detectChanges()` excessively** — synchronous CD bypasses batching and can cause cascading re-renders
- **Inline object/array literals in templates**: `[config]="{density: 'compact'}"` creates new object every parent render → defeats OnPush on child
- **Subscribing manually instead of async pipe** — manual subscriptions require `markForCheck()` to be called manually after each emission, which is easy to forget
- **trackBy returning `index`** — no better than no trackBy on item removals/insertions
- **No OnPush on container components** — the entire benefit is lost if parent containers don't use OnPush too

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Bosch (Hruday's direct experience):**
The real-time WebSocket dashboard at Bosch received price/sensor updates 10x per second. With default change detection, every update triggered full-tree CD across 150+ components — 50ms per update, causing visible jitter at 10Hz. After converting all components to OnPush and running WebSocket updates outside NgZone with `markForCheck()` on each tick, CD time dropped to 2ms. The app became smooth at 60fps.

**SAP Fiori:**
SAP UI5's Angular-based components (SAP Fiori Elements) mandate OnPush for all table and list components. A 500-row `mdcTable` without trackBy caused 8s freeze on sort; with trackBy on row identity, the same sort was 80ms.

**Adobe Analytics Dashboard:**
Angular-based reporting dashboards showing 1000+ data points in charts and tables. OnPush on all chart components + trackBy on data series = CD time reduced from 180ms/update to 12ms/update.

**Scaling:**
- Small app: OnPush is a nice-to-have
- 50+ components: OnPush is required — default CD creates ~30ms per interaction
- Real-time data (WebSocket, RxJS polling): OnPush + `runOutsideAngular` is mandatory

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "OnPush is the single most impactful performance optimization in Angular. Angular's default strategy is 'check everything on every event' — Zone.js triggers full-tree change detection for every setTimeout, HTTP response, or DOM event. When you switch a component to OnPush, Angular skips that component's subtree unless one of four things happens: an @Input() reference changes, an event fires inside the component, an Observable piped through `async` emits, or `markForCheck()` is called. At Bosch, our WebSocket dashboard was updating 10 times per second with 150 components on screen. Default CD was costing us 50ms per frame — visual jitter was obvious. We moved everything to OnPush, ran socket updates outside NgZone, and called `markForCheck()` once per tick. CD dropped to 2ms. Combined with trackBy on all ngFor loops — which prevents DOM destruction on list updates — we hit a smooth 60fps even on mid-tier laptops. The key discipline is that OnPush requires immutable data patterns — you must replace object references rather than mutate them, which is exactly what NgRx reducers do naturally."

**Likely Follow-up Questions:**
1. *What exactly triggers OnPush change detection?* → New @Input() reference, DOM event in component, async pipe emission, markForCheck(), detectChanges()
2. *Why can't you mutate @Input() objects with OnPush?* → Angular compares by reference (===), not deep equality — mutation keeps same reference → no CD trigger
3. *What is runOutsideAngular() and why does it matter?* → Zone.js is what triggers CD; running WebSocket/animation outside Angular zone means no unnecessary CD on each message
4. *When would you use detectChanges() vs markForCheck()?* → detectChanges() = synchronous, immediate; markForCheck() = schedule for next cycle — use markForCheck() for frequent updates to benefit from batching
5. *How do Angular Signals change the OnPush story?* → Signals make OnPush even more granular — only template expressions consuming the changed signal re-evaluate, not the whole component view

**How to Explain Trade-offs Verbally:**
> "The cost of OnPush is the immutability contract — you can no longer mutate objects passed as inputs. In practice, this is a discipline tax that pays off enormously in teams using NgRx (which auto-enforces immutability) but can be a source of subtle bugs in teams mixing mutable and immutable patterns. I always pair OnPush with NgRx or signals to eliminate that risk."

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (OnPush + trackBy Full Component)
────────────────────────────────────────────────────────────

```typescript
// High-performance list component — production pattern
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import type { Order } from '@app/models';

@Component({
  selector: 'app-order-list',
  template: `
    <table role="grid" aria-label="Orders">
      <tbody>
        <tr
          *ngFor="let order of orders; trackBy: trackByOrderId"
          [class.selected]="order.id === selectedId"
          (click)="selectOrder.emit(order.id)"
        >
          <td>{{ order.id }}</td>
          <td>{{ order.customer }}</td>
          <td>{{ order.total | currency }}</td>
          <td [ngClass]="getStatusClass(order.status)">
            {{ order.status }}
          </td>
        </tr>
      </tbody>
    </table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderListComponent {
  @Input() orders: Order[] = [];
  @Input() selectedId: string | null = null;
  @Output() selectOrder = new EventEmitter<string>();

  // Pure function — no external dependencies, always same output for same input
  trackByOrderId(_index: number, order: Order): string {
    return order.id;
  }

  // Pure function — used in template binding
  getStatusClass(status: Order['status']): string {
    const map: Record<Order['status'], string> = {
      pending: 'status--pending',
      completed: 'status--success',
      cancelled: 'status--error',
    };
    return map[status];
  }
}
```

**Why this code is interview-ready:**
- `ChangeDetectionStrategy.OnPush` on a list component — highest impact location
- `trackByOrderId` with `_index` (unused, but required by ngFor signature)
- All methods are pure — no side effects — safe with OnPush
- `@Output()` events are the correct way to trigger parent state updates from OnPush children

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"OnPush = opt-in, check only when something I own changed."**

**Four OnPush triggers (IAME):**
1. **I**nput reference changed
2. **A**sync pipe emitted
3. **M**arkForCheck() called
4. **E**vent fired inside this component

**trackBy rule:** Always use entity ID, never array index.

**The immutability law:** OnPush + mutation = silent bug. Always create new references.

**If you go blank:** "OnPush skips a component's subtree unless its @Input() references change. trackBy prevents DOM destruction on list updates. Together they're the foundation of Angular performance."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **INP**: Angular CD running in the main thread is the most common cause of Angular INP failures
→ **60fps**: OnPush reduces CD from O(n components) to O(dirty components) — enabling 60fps on complex UIs
→ **Real-time apps**: Without OnPush, WebSocket-driven UIs are impossible to keep performant

**How it works:**
→ Zone.js monkeypatches browser APIs to intercept async operations. By default, every intercepted async operation triggers Angular's tick(), which runs CD on the entire component tree. OnPush marks a component's subtree as "clean" until Angular tracks a relevant change, drastically reducing the number of components checked per tick.

**Company relevance:**
→ **Microsoft**: Azure Portal is Angular-based with hundreds of components — OnPush is mandated in their internal style guide
→ **Adobe**: Campaign Manager uses Angular with live campaign data updates — OnPush + NgRx is the standard stack
→ **Salesforce**: Service Cloud Console has real-time case updates — OnPush prevents full-page CD on each WebSocket message
→ **Cisco**: WebEx Control Hub is built in Angular — OnPush is required on all table/list components handling device data
