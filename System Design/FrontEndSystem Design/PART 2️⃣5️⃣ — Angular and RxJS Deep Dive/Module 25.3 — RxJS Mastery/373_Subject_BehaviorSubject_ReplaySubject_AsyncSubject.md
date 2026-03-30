# 373 – Subject, BehaviorSubject, ReplaySubject, AsyncSubject

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Subject** — multicast, no initial value, late subscribers miss past values. **BehaviorSubject** — has current value, new subscribers get last emitted. **ReplaySubject** — buffers N past values for late subscribers. **AsyncSubject** — emits only the LAST value on completion. BehaviorSubject is most common for state management.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── SUBJECT ────
// No initial value, no replay
const subject = new Subject<string>();
subject.subscribe(v => console.log('A:', v));
subject.next('hello');   // A: hello
subject.subscribe(v => console.log('B:', v)); // B missed 'hello'
subject.next('world');   // A: world, B: world

// ──── BEHAVIORSUBJECT ────
// Has current value, replays LAST value to new subscribers
const user$ = new BehaviorSubject<User | null>(null); // initial value required
console.log(user$.getValue()); // null (synchronous access)

user$.subscribe(u => console.log('A:', u)); // A: null (gets current)
user$.next({ name: 'Hruday' });              // A: { name: 'Hruday' }
user$.subscribe(u => console.log('B:', u)); // B: { name: 'Hruday' } (gets last)

// Common: auth state, current route, selected item
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable(); // expose read-only

  login(user: User) { this.userSubject.next(user); }
  logout() { this.userSubject.next(null); }
  get currentUser() { return this.userSubject.getValue(); } // sync access
}

// ──── REPLAYSUBJECT ────
// Buffers N past values for late subscribers
const replay$ = new ReplaySubject<string>(3); // buffer last 3
replay$.next('a');
replay$.next('b');
replay$.next('c');
replay$.next('d');
replay$.subscribe(v => console.log(v)); // c, d — wait, buffers last 3: b, c, d

// With time window
const timedReplay$ = new ReplaySubject<string>(100, 5000); // last 100 values within 5s

// ──── ASYNCSUBJECT ────
// Emits only the LAST value, only on complete()
const async$ = new AsyncSubject<number>();
async$.subscribe(v => console.log(v));
async$.next(1);
async$.next(2);
async$.next(3);
async$.complete(); // logs: 3 (only last value, on complete)

// ──── COMPARISON TABLE ────
// | Type           | Initial | Replay     | When           |
// |----------------|---------|------------|----------------|
// | Subject        | No      | None       | Multicast      |
// | BehaviorSubject| Yes     | Last 1     | State mgmt     |
// | ReplaySubject  | No      | Last N     | Event history  |
// | AsyncSubject   | No      | Last on ✓  | Final result   |

// ──── BEST PRACTICES ────
// 1. Always expose .asObservable() — prevent external .next()
// 2. Use BehaviorSubject for state (has synchronous .getValue())
// 3. Avoid .getValue() in reactive chains — subscribe instead
// 4. Complete subjects in ngOnDestroy to prevent leaks
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"BehaviorSubject for state management — has current value, replays last to late subscribers. Subject for events without history. ReplaySubject when late subscribers need past N values. I expose asObservable() to prevent external writes. BehaviorSubject powers most of my Angular services."*

## 4. 🧠 MEMORY AID
**"Subject = no replay. BehaviorSubject = last value + initial. ReplaySubject = last N values. AsyncSubject = last value on complete. BS is for State."**
