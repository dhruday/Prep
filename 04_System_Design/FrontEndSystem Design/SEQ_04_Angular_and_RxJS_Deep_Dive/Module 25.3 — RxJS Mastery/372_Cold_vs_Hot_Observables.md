# 372 – Cold vs Hot Observables

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Cold Observable** — creates a new producer per subscriber (e.g., HTTP request). Each subscriber gets its own data stream. **Hot Observable** — shares a single producer across subscribers (e.g., mouse events, WebSocket). Subscribing late means you miss earlier emissions. Use `share()` / `shareReplay()` to make cold observables hot.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── COLD OBSERVABLE ────
// Each subscriber triggers a NEW execution
const cold$ = new Observable(subscriber => {
  console.log('Producer created'); // runs per subscriber
  subscriber.next(Math.random());
  subscriber.complete();
});

cold$.subscribe(v => console.log('A:', v)); // Producer created, A: 0.123
cold$.subscribe(v => console.log('B:', v)); // Producer created, B: 0.789
// Each subscriber gets DIFFERENT random number

// HTTP is cold — each subscribe = new request
const users$ = this.http.get<User[]>('/api/users');
users$.subscribe(); // request 1
users$.subscribe(); // request 2 (duplicate!)

// ──── HOT OBSERVABLE ────
// Single producer, multiple subscribers share it
const clicks$ = fromEvent(document, 'click'); // clicks happen regardless of subscribers
const ws$ = new WebSocket('ws://server');       // connection exists independently

// ──── MAKING COLD → HOT ────
// share() — multicast, refCount (auto-connect/disconnect)
const shared$ = this.http.get<User[]>('/api/users').pipe(
  share(), // single request shared across subscribers
);
shared$.subscribe(); // triggers request
shared$.subscribe(); // shares same response (if subscribed before completion)

// shareReplay(1) — cache last N emissions for late subscribers
const cachedUsers$ = this.http.get<User[]>('/api/users').pipe(
  shareReplay(1), // cache last emission, replay to late subscribers
);
cachedUsers$.subscribe(); // triggers request
// ... later
cachedUsers$.subscribe(); // gets cached response, NO new request

// ──── SUBJECT = HOT BY NATURE ────
const subject = new Subject<number>();
subject.subscribe(v => console.log('A:', v));
subject.next(1); // A: 1
subject.subscribe(v => console.log('B:', v));
subject.next(2); // A: 2, B: 2 (B missed value 1)

// ──── PRACTICAL PATTERN: CACHE SERVICE ────
@Injectable({ providedIn: 'root' })
export class UserService {
  private users$ = this.http.get<User[]>('/api/users').pipe(
    shareReplay({ bufferSize: 1, refCount: true }), // cache + auto-cleanup
  );

  getUsers(): Observable<User[]> {
    return this.users$;
  }
}
```

### Comparison
| Aspect | Cold | Hot |
|---|---|---|
| **Producer** | Created per subscriber | Shared |
| **Execution** | Lazy (on subscribe) | Eager (already running) |
| **Late subscriber** | Gets all values | Misses past values |
| **Examples** | HTTP, of(), from() | Subject, fromEvent, WebSocket |
| **Make hot** | share(), shareReplay() | Already hot |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Cold observables create a new producer per subscriber — like HTTP calls. Hot observables share one producer — like DOM events or WebSockets. I use shareReplay(1) to cache API responses and share() for multicast without replay. refCount: true auto-unsubscribes when no subscribers remain."*

## 4. 🧠 MEMORY AID
**"Cold = Netflix (each viewer starts from beginning). Hot = Live TV (join in progress, miss the start). shareReplay(1) = DVR (late viewers get replay)."**
