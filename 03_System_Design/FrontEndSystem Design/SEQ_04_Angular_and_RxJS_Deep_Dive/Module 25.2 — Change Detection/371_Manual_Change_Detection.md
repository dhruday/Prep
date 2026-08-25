# 371 – Manual Change Detection – markForCheck vs detectChanges

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
`markForCheck()` marks the component and its ancestors dirty — CD will check them on the NEXT cycle. `detectChanges()` runs CD immediately on this component and its children. Use `markForCheck()` with OnPush when data comes from outside Angular (WebSocket, third-party lib). Use `detectChanges()` sparingly for immediate DOM updates.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── markForCheck() ────
// Marks component path to root as dirty. CD runs on NEXT cycle.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>{{ message }}</div>`,
})
export class NotificationComponent implements OnInit {
  message = '';
  
  constructor(
    private cdr: ChangeDetectorRef,
    private wsService: WebSocketService,
  ) {}

  ngOnInit() {
    // WebSocket updates come from outside Angular zone
    this.wsService.messages$.subscribe(msg => {
      this.message = msg;
      this.cdr.markForCheck(); // ✅ Schedule CD for next cycle
    });
  }
}

// ──── detectChanges() ────
// Runs CD immediately on this component subtree
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas></canvas><div>FPS: {{ fps }}</div>`,
})
export class AnimationComponent {
  fps = 0;
  
  constructor(private cdr: ChangeDetectorRef) {}

  onAnimationFrame() {
    this.fps = this.calculateFPS();
    this.cdr.detectChanges(); // ✅ Update DOM immediately
  }
}

// ──── detach() / reattach() ────
// Remove component from CD tree entirely
@Component({
  template: `<div *ngFor="let item of items">{{ item.value }}</div>`,
})
export class HighFrequencyComponent implements OnInit {
  items: Item[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cdr.detach(); // Remove from CD entirely

    // Manually check every 5 seconds instead of every CD cycle
    setInterval(() => {
      this.cdr.detectChanges();
    }, 5000);
  }
}

// ──── COMPARISON ────
// markForCheck():
//   - Schedules CD (async)
//   - Marks THIS + ancestors dirty
//   - CD framework decides when to run
//   - ✅ Safe, preferred

// detectChanges():
//   - Runs CD immediately (sync)
//   - Only on THIS component subtree
//   - You control timing
//   - ⚠️ Use sparingly, can cause ExpressionChangedAfterItHasBeenChecked

// ──── COMMON PITFALL ────
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
export class BrokenComponent {
  data: string;
  
  constructor(private cdr: ChangeDetectorRef) {
    // ❌ Don't call in constructor — view not ready
    // this.cdr.detectChanges();
  }
  
  ngAfterViewInit() {
    this.data = 'loaded';
    this.cdr.detectChanges(); // ✅ Safe here
  }
}
```

### Decision Matrix
| Scenario | Method |
|---|---|
| WebSocket/3rd party data with OnPush | `markForCheck()` |
| Observable without async pipe | `markForCheck()` |
| Immediate DOM update needed | `detectChanges()` |
| After ViewChild manipulation | `detectChanges()` |
| High-frequency updates (skip most) | `detach()` + periodic `detectChanges()` |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"markForCheck schedules dirty-checking for the next CD cycle — safe and preferred with OnPush. detectChanges runs CD immediately on the subtree — for urgent DOM updates. At Bosch, our WebSocket dashboard used markForCheck for data updates and detach()+detectChanges() for the real-time chart that only needed 5fps visual updates."*

## 4. 🧠 MEMORY AID
**"markForCheck = 'dirty flag, check me later'. detectChanges = 'check me NOW'. detach = 'don't check me at all'. markForCheck is safe default."**
