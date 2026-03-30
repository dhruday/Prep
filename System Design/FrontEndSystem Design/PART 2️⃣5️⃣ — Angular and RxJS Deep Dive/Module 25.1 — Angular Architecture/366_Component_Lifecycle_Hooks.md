# 366 – Component Lifecycle Hooks – All 8 Hooks & When to Use

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Angular components have 8 lifecycle hooks called in order: `ngOnChanges` → `ngOnInit` → `ngDoCheck` → `ngAfterContentInit` → `ngAfterContentChecked` → `ngAfterViewInit` → `ngAfterViewChecked` → `ngOnDestroy`. Most use only 3: `ngOnInit` (setup), `ngOnChanges` (react to inputs), `ngOnDestroy` (cleanup).

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
@Component({ selector: 'app-lifecycle', template: `<ng-content></ng-content><div #chart></div>` })
export class LifecycleComponent implements OnInit, OnChanges, OnDestroy,
  DoCheck, AfterContentInit, AfterContentChecked, AfterViewInit, AfterViewChecked {

  @Input() data: any[];
  @ViewChild('chart') chartRef: ElementRef;

  // 1️⃣ ngOnChanges — called when @Input() bindings change
  // Called BEFORE ngOnInit, then on every input change
  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && !changes['data'].firstChange) {
      this.updateChart(changes['data'].currentValue);
    }
  }

  // 2️⃣ ngOnInit — called ONCE after first ngOnChanges
  // Best for: initialization, API calls, subscriptions
  ngOnInit() {
    this.subscription = this.dataService.getData().subscribe();
  }

  // 3️⃣ ngDoCheck — called every change detection cycle
  // ⚠️ Expensive! Use for custom change detection only
  ngDoCheck() {
    // Custom deep comparison, detect changes Angular misses
  }

  // 4️⃣ ngAfterContentInit — called ONCE after <ng-content> projected
  ngAfterContentInit() {
    // Content children available here
  }

  // 5️⃣ ngAfterContentChecked — called after every CD check of projected content
  ngAfterContentChecked() { }

  // 6️⃣ ngAfterViewInit — called ONCE after view (template + children) initialized
  // Best for: DOM manipulation, chart initialization, ViewChild access
  ngAfterViewInit() {
    this.initChart(this.chartRef.nativeElement);
  }

  // 7️⃣ ngAfterViewChecked — called after every CD check of view
  ngAfterViewChecked() { }

  // 8️⃣ ngOnDestroy — called when component is destroyed
  // Best for: unsubscribe, cleanup, remove listeners
  ngOnDestroy() {
    this.subscription?.unsubscribe();
    window.removeEventListener('resize', this.handleResize);
  }
}
```

### Quick Reference
| Hook | When | Use For |
|---|---|---|
| `ngOnChanges` | Input changes | React to prop changes |
| `ngOnInit` | Once, after first inputs | Init, API calls, subscribe |
| `ngDoCheck` | Every CD cycle | Custom change detection |
| `ngAfterContentInit` | Once, after ng-content | Access @ContentChild |
| `ngAfterContentChecked` | Every CD, content | Rare |
| `ngAfterViewInit` | Once, after view ready | DOM ops, @ViewChild |
| `ngAfterViewChecked` | Every CD, view | Rare (perf concern) |
| `ngOnDestroy` | Component destroyed | Unsubscribe, cleanup |

### Common Patterns
```typescript
// Pattern: takeUntil for auto-unsubscribe
private destroy$ = new Subject<void>();

ngOnInit() {
  this.dataService.getData()
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => this.data = data);
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"The 3 critical hooks: ngOnInit for initialization and API calls, ngOnChanges for reacting to input changes, ngOnDestroy for cleanup (unsubscribe, remove listeners). ngAfterViewInit for DOM access via ViewChild. I use the takeUntil pattern for automatic RxJS cleanup."*

## 4. 🧠 MEMORY AID
**"Init hooks: OnChanges → OnInit → AfterViewInit. Cleanup: OnDestroy. Memory: 'Changes → Init → View → Destroy'. DoCheck is expensive — avoid."**
