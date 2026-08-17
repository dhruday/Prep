# 363 – Sharing State Across Frameworks in Micro-Frontend

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
In micro-frontend architectures, different frameworks need shared state (user session, theme, cart). Solutions: **Custom Events** (simple), **shared global store** (rxjs BehaviorSubject, zustand), **URL/query params** (routing state), **localStorage/sessionStorage** (persistence), **Module Federation shared scope**. The key challenge: avoid tight coupling.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── APPROACH 1: Custom Events (simplest) ────
// Shared event contract
interface SharedEvents {
  'user:login': { userId: string; name: string };
  'theme:changed': { theme: 'light' | 'dark' };
  'cart:updated': { items: number };
}

// Publisher (any framework)
function emitSharedEvent<K extends keyof SharedEvents>(event: K, data: SharedEvents[K]) {
  window.dispatchEvent(new CustomEvent(event, { detail: data }));
}

// Subscriber (any framework)
function onSharedEvent<K extends keyof SharedEvents>(event: K, handler: (data: SharedEvents[K]) => void) {
  const listener = (e: Event) => handler((e as CustomEvent).detail);
  window.addEventListener(event, listener);
  return () => window.removeEventListener(event, listener);
}

// React micro-frontend
useEffect(() => {
  const unsub = onSharedEvent('user:login', (data) => setUser(data));
  return unsub;
}, []);

// Angular micro-frontend
connectedCallback() {
  this.unsub = onSharedEvent('theme:changed', (data) => this.applyTheme(data.theme));
}

// ──── APPROACH 2: Shared Observable Store ────
// shared-store.ts (loaded once, shared via Module Federation or global)
import { BehaviorSubject } from 'rxjs';

export interface GlobalState {
  user: { id: string; name: string } | null;
  theme: 'light' | 'dark';
  cartCount: number;
}

const initialState: GlobalState = { user: null, theme: 'light', cartCount: 0 };
export const globalState$ = new BehaviorSubject<GlobalState>(initialState);

export function updateGlobalState(partial: Partial<GlobalState>) {
  globalState$.next({ ...globalState$.value, ...partial });
}

// React hook adapter
export function useGlobalState(): GlobalState {
  const [state, setState] = useState(globalState$.value);
  useEffect(() => {
    const sub = globalState$.subscribe(setState);
    return () => sub.unsubscribe();
  }, []);
  return state;
}

// Angular service adapter
@Injectable({ providedIn: 'root' })
export class GlobalStateService {
  readonly state$ = globalState$.asObservable();
  update(partial: Partial<GlobalState>) { updateGlobalState(partial); }
}

// ──── APPROACH 3: URL as Shared State ────
// Use URL query params for cross-MFE state
// ?userId=123&theme=dark&view=dashboard
// Each MFE reads from URL, framework-agnostic

// ──── APPROACH 4: Module Federation Shared Scope ────
// webpack.config.js
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      shared: {
        'shared-store': { singleton: true, eager: true },
        'rxjs': { singleton: true },
      },
    }),
  ],
};
```

### Comparison
| Approach | Coupling | Persistence | Complexity | Best For |
|---|---|---|---|---|
| Custom Events | Very low | None | Low | Simple notifications |
| BehaviorSubject | Low | None | Medium | Reactive shared state |
| localStorage | Very low | Yes | Low | Persistent settings |
| URL params | Very low | Yes (bookmarkable) | Low | Routing state |
| Module Federation | Medium | None | High | Large scale apps |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"For cross-framework state sharing, I use a layered approach: Custom Events for simple notifications, a shared BehaviorSubject store for reactive state, URL params for routing state, and localStorage for persistence. The key is a framework-agnostic contract. At SAP, we shared user session and theme across Angular and React micro-frontends using a BehaviorSubject singleton."*

## 4. 🧠 MEMORY AID
**"Custom Events = fire-and-forget. BehaviorSubject = reactive store. URL = shareable state. localStorage = persistent. Contract > implementation."**

## 5. 🎯 KEY INSIGHT
The golden rule: the shared state layer must be framework-agnostic. If it imports React or Angular, it's too coupled. Vanilla JS/TS + RxJS is the sweet spot.
