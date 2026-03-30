# 382 – OnPush + trackBy – Avoiding Unnecessary Checks

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**OnPush** limits change detection to input reference changes, events, and async pipe. **trackBy** tells `*ngFor` how to identify items — without it, Angular re-creates all DOM elements on array changes. Together, OnPush + trackBy + immutable data = minimal DOM operations and fast rendering.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── trackBy — identify items for *ngFor ────
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ❌ Without trackBy: all DOM elements re-created on any array change -->
    <div *ngFor="let user of users">{{ user.name }}</div>
    
    <!-- ✅ With trackBy: only changed items re-rendered -->
    <div *ngFor="let user of users; trackBy: trackByUserId">{{ user.name }}</div>
    
    <!-- Angular 17+ @for with built-in track -->
    @for (user of users; track user.id) {
      <div>{{ user.name }}</div>
    }
  `,
})
export class UserListComponent {
  @Input() users: User[] = [];

  trackByUserId(index: number, user: User): number {
    return user.id; // unique identifier
  }
}

// ──── WHY trackBy MATTERS ────
// Without trackBy:
// users = [A, B, C] → users = [A, B, C, D]
// Angular destroys ALL DOM nodes, creates 4 new ones

// With trackBy(user.id):
// users = [A, B, C] → users = [A, B, C, D]
// Angular keeps A, B, C DOM nodes, adds 1 new node for D

// ──── ONPUSH + IMMUTABLE DATA PATTERNS ────
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (item of items(); track item.id) {
      <app-item [item]="item" />
    }
  `,
})
export class ListComponent {
  items = signal<Item[]>([]);

  addItem(newItem: Item) {
    // ✅ New array reference — triggers OnPush CD
    this.items.update(items => [...items, newItem]);
  }

  updateItem(id: number, changes: Partial<Item>) {
    // ✅ New array + new object references
    this.items.update(items =>
      items.map(item => item.id === id ? { ...item, ...changes } : item),
    );
  }

  removeItem(id: number) {
    this.items.update(items => items.filter(item => item.id !== id));
  }
}

// ──── COMMON ANTI-PATTERNS ────

// ❌ Function calls in template — re-evaluated every CD cycle
template: `<div>{{ getTotal() }}</div>` // runs on EVERY check

// ✅ Use computed/pipe instead
total = computed(() => this.items().reduce((sum, i) => sum + i.price, 0));
template: `<div>{{ total() }}</div>` // memoized, only recalcs when items change

// ❌ Complex expressions in template
template: `<div>{{ items.filter(i => i.active).length }}</div>`

// ✅ Pre-compute in component
activeCount = computed(() => this.items().filter(i => i.active).length);
```

### Performance Checklist
```
✅ OnPush on every component
✅ trackBy / track in @for
✅ Immutable updates (spread, not mutate)
✅ computed() for derived values (not template functions)
✅ async pipe (or toSignal) instead of manual subscribe
✅ Pure pipes for template transformations
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"OnPush limits CD to input ref changes and events. trackBy (or @for track) prevents ngFor from destroying/re-creating all DOM nodes. Combined with immutable data patterns, CD only touches changed components. At SAP, this reduced our Fiori dashboard rendering time by 70% on lists with 500+ items."*

## 4. 🧠 MEMORY AID
**"OnPush = skip unless inputs change. trackBy = reuse DOM nodes. Immutable = new reference = change detected. computed() = no template functions."**
