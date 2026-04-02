# 368 – Default vs OnPush Change Detection

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Default** CD checks every component on every event/timer/HTTP response — simple but expensive. **OnPush** only checks when: (1) @Input reference changes, (2) event in component/child fires, (3) async pipe receives new value, or (4) manual trigger. Use OnPush everywhere for performance.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── DEFAULT STRATEGY ────
// Checks ALL bindings in ALL components on every CD cycle
@Component({
  selector: 'app-default',
  changeDetection: ChangeDetectionStrategy.Default, // implicit
  template: `{{ computeExpensiveValue() }}`, // runs every CD cycle!
})
export class DefaultComponent {
  computeExpensiveValue() {
    console.log('called on EVERY change detection!');
    return this.data.reduce((sum, item) => sum + item.value, 0);
  }
}

// ──── ONPUSH STRATEGY ────
@Component({
  selector: 'app-onpush',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>{{ user.name }}</div>
    <div>{{ data$ | async }}</div>
  `,
})
export class OnPushComponent {
  @Input() user: User;  // must pass NEW reference to trigger CD
  data$ = this.dataService.getData(); // async pipe handles CD

  constructor(private dataService: DataService) {}
}

// ──── WHAT TRIGGERS ONPUSH CD ────
// 1. @Input reference changes (not mutation!)
//    ✅ this.user = { ...this.user, name: 'New' };  // new object
//    ❌ this.user.name = 'New';  // mutation — NOT detected

// 2. DOM event from this component or child
//    ✅ (click), (keyup), etc.

// 3. async pipe emits new value
//    ✅ {{ data$ | async }}

// 4. Manual trigger
//    ✅ this.cdr.markForCheck();  // marks path to root dirty
//    ✅ this.cdr.detectChanges(); // runs CD on this subtree now

// ──── COMMON MISTAKE: MUTATION WITH ONPUSH ────
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
export class BrokenComponent {
  @Input() items: string[];
  
  addItem(item: string) {
    this.items.push(item);  // ❌ mutation, OnPush won't detect
  }
}

@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
export class FixedComponent {
  @Input() items: string[];
  
  addItem(item: string) {
    this.items = [...this.items, item];  // ✅ new reference
  }
}
```

### CD Flow
```
Default: Zone.js triggers → Check ALL components top-down
OnPush: Zone.js triggers → Only check marked dirty components
         (input ref change, event, async, markForCheck)
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I use OnPush everywhere — it limits CD to input ref changes, events, and async pipe emissions. Combined with immutable data patterns, it dramatically reduces unnecessary checks. At SAP, switching to OnPush across our Fiori dashboard cut CD cycles by 70%. The key is: new references for inputs, async pipe for observables, markForCheck for imperative updates."*

## 4. 🧠 MEMORY AID
**"Default = check everything. OnPush = check only when: Input REF changes, Event fires, Async pipe emits, markForCheck(). Mnemonic: 'REAM'."**
