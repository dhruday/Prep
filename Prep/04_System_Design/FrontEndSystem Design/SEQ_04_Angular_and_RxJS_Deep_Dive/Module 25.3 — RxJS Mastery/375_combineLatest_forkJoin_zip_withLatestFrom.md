# 375 – combineLatest, forkJoin, zip, withLatestFrom

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Four **combination operators**. **combineLatest** — emits when ANY source emits (requires all to have emitted once). **forkJoin** — emits once when ALL sources complete. **zip** — pairs values by index. **withLatestFrom** — grabs latest from other sources when primary emits.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── combineLatest ────
// Emits array of latest values whenever ANY source emits
// All sources must emit at least once before first emission
const user$ = this.userService.getUser();
const settings$ = this.settingsService.getSettings();
const permissions$ = this.authService.getPermissions();

combineLatest([user$, settings$, permissions$]).pipe(
  map(([user, settings, permissions]) => ({
    user, settings, permissions,
  })),
).subscribe(viewModel => this.vm = viewModel);

// USE: ViewModel composition, reactive forms, dashboard widgets

// ──── forkJoin ────
// Waits for ALL sources to COMPLETE, emits last value of each
// Like Promise.all() for Observables
forkJoin({
  users: this.http.get<User[]>('/api/users'),
  products: this.http.get<Product[]>('/api/products'),
  config: this.http.get<Config>('/api/config'),
}).subscribe(({ users, products, config }) => {
  this.users = users;
  this.products = products;
  this.config = config;
});

// USE: Parallel API calls on page load, init data fetching
// ⚠️ If ANY source errors, ALL are lost. Handle errors per-source:
forkJoin({
  users: this.http.get<User[]>('/api/users').pipe(catchError(() => of([]))),
  products: this.http.get<Product[]>('/api/products').pipe(catchError(() => of([]))),
}).subscribe(result => { /* safe */ });

// ──── zip ────
// Pairs values by emission index (1st with 1st, 2nd with 2nd)
const name$ = of('Hruday', 'Alice', 'Bob');
const score$ = of(95, 88, 72);

zip(name$, score$).subscribe(([name, score]) => {
  console.log(`${name}: ${score}`);
  // Hruday: 95, Alice: 88, Bob: 72
});

// USE: Pairing related streams, coordinated emissions
// ⚠️ Slowest source dictates pace (backpressure risk)

// ──── withLatestFrom ────
// When PRIMARY emits, grab latest from OTHER sources
// Other sources don't trigger emission
this.saveButton$.pipe(
  withLatestFrom(this.form.valueChanges, this.userId$),
  map(([click, formValue, userId]) => ({ ...formValue, userId })),
  switchMap(payload => this.api.save(payload)),
).subscribe();

// USE: Button clicks that need current state, action + context
```

### Comparison
| Operator | When Emits | Completes | Use Case |
|---|---|---|---|
| `combineLatest` | Any source emits (after all emit once) | When all complete | ViewModel, reactive UI |
| `forkJoin` | All sources complete | Immediately | Parallel HTTP, init load |
| `zip` | All sources emit Nth value | When any completes | Index-paired streams |
| `withLatestFrom` | Primary emits | When primary completes | Action + latest context |

```
combineLatest: A--1--2------3-->
               B----x----y---->
               ----[1,x]-[2,x]-[2,y]-[3,y]-->

forkJoin:      A--1--2--3-|
               B----x--y--|
               -----------[3,y]|

zip:           A--1----2----3-->
               B----x----y---->
               ----[1,x]-[2,y]-->
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"combineLatest for ViewModel composition — emits when any source updates. forkJoin for parallel init API calls (like Promise.all). withLatestFrom when a button click needs current form state. zip for index-paired data. At SAP, dashboard used combineLatest([user$, metrics$, alerts$]) for reactive ViewModel."*

## 4. 🧠 MEMORY AID
**"combineLatest = 'any fires, all contribute'. forkJoin = 'Promise.all (wait for all complete)'. zip = 'pair by index'. withLatestFrom = 'grab latest on my terms'."**
