# 376 – takeUntil Pattern for Memory Leak Prevention

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
The **takeUntil** pattern uses a `destroy$` Subject to automatically unsubscribe all Observables when a component is destroyed. Emit on `destroy$` in `ngOnDestroy` → all subscriptions with `takeUntil(this.destroy$)` complete. This prevents memory leaks from forgotten unsubscriptions.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── THE takeUntil PATTERN ────
@Component({ selector: 'app-dashboard' })
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // All subscriptions auto-complete when destroy$ emits
    this.userService.getUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.user = user);

    this.metricsService.getMetrics()
      .pipe(takeUntil(this.destroy$))
      .subscribe(metrics => this.metrics = metrics);

    this.wsService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => this.handleMessage(msg));
  }

  ngOnDestroy() {
    this.destroy$.next();     // emit to unsubscribe all
    this.destroy$.complete(); // complete the subject
  }
}

// ──── ⚠️ takeUntil MUST BE LAST OPERATOR ────
// Wrong — operators after takeUntil can re-subscribe
observable$.pipe(
  takeUntil(this.destroy$),
  switchMap(v => this.api.get(v)), // ❌ switchMap may re-subscribe
).subscribe();

// Correct — takeUntil is always last (before subscribe)
observable$.pipe(
  switchMap(v => this.api.get(v)),
  takeUntil(this.destroy$), // ✅ Last in pipe
).subscribe();

// ──── ALTERNATIVE: DestroyRef (Angular 16+) ────
@Component({ selector: 'app-modern' })
export class ModernComponent {
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.dataService.getData()
      .pipe(takeUntilDestroyed(this.destroyRef)) // auto-cleanup!
      .subscribe(data => this.data = data);
  }
}

// Even simpler — inject in constructor context
@Component({ selector: 'app-simplest' })
export class SimplestComponent {
  constructor() {
    // takeUntilDestroyed() with no args — only works in injection context
    this.dataService.getData()
      .pipe(takeUntilDestroyed())
      .subscribe(data => this.data = data);
  }
}

// ──── ALTERNATIVE: async PIPE (no manual subscribe at all) ────
@Component({
  template: `
    <div *ngIf="user$ | async as user">{{ user.name }}</div>
    <div *ngFor="let metric of metrics$ | async">{{ metric.value }}</div>
  `,
})
export class AsyncPipeComponent {
  user$ = this.userService.getUser();     // no subscribe needed
  metrics$ = this.metricsService.getAll(); // async pipe handles lifecycle
}

// ──── WHAT LEAKS WITHOUT CLEANUP ────
// 1. Subscriptions keep callbacks in memory after component destroys
// 2. WebSocket/interval subscriptions run forever
// 3. HTTP subscriptions may trigger on destroyed component
// 4. Event listeners accumulate on each re-creation
```

### Unsubscribe Strategies Ranked
| Strategy | Boilerplate | Safety | Recommended |
|---|---|---|---|
| `async` pipe | None | Auto | ✅ Best |
| `takeUntilDestroyed()` | Minimal | Auto | ✅ Angular 16+ |
| `takeUntil(destroy$)` | Low | Manual | ✅ Classic |
| `Subscription.add()` | Medium | Manual | OK |
| Manual `.unsubscribe()` | High | Error-prone | Avoid |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I prefer async pipe (zero manual subscriptions). When I must subscribe imperatively, I use takeUntilDestroyed() in Angular 16+ or the takeUntil(destroy$) pattern — emit in ngOnDestroy, all subscriptions auto-complete. Key rule: takeUntil must be the LAST operator in the pipe."*

## 4. 🧠 MEMORY AID
**"async pipe > takeUntilDestroyed() > takeUntil(destroy$). takeUntil ALWAYS LAST in pipe. ngOnDestroy: next() + complete()."**
