# 381 – Akita vs NgRx vs Signal Store Trade-offs

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Three Angular state management approaches: **NgRx** (Redux-like, actions/reducers/effects — enterprise-grade but verbose), **Akita** (OOP-friendly, less boilerplate, EntityStore), **Signal Store** (@ngrx/signals — signals-based, minimal boilerplate, Angular 17+). Choose based on team size, complexity, and Angular version.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── NgRx (Redux Pattern) ────
// Pros: DevTools, time-travel debugging, strong patterns, large ecosystem
// Cons: Verbose (actions+reducer+effects+selectors), steep learning curve

// Store + Actions + Reducer + Effects + Selectors = 5 files per feature
const userReducer = createReducer(initialState,
  on(loadUsersSuccess, (state, { users }) => ({ ...state, users })),
);

// ──── Akita (OOP Pattern) ────
// Pros: Less boilerplate, OOP-friendly, built-in entity features
// Cons: Smaller community, less tooling, no longer actively maintained

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'users' })
export class UserStore extends EntityStore<UserState> {
  constructor() { super(); }
}

@Injectable({ providedIn: 'root' })
export class UserQuery extends QueryEntity<UserState> {
  constructor(protected store: UserStore) { super(store); }
  selectActiveUsers$ = this.selectAll({ filterBy: u => u.active });
}

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private store: UserStore, private http: HttpClient) {}
  
  loadUsers() {
    this.http.get<User[]>('/api/users').subscribe(users => {
      this.store.set(users); // direct store mutation
    });
  }
}

// ──── @ngrx/signals — SignalStore (Angular 17+) ────
// Pros: Minimal boilerplate, signals-based, functional, composable
// Cons: New (less ecosystem), requires Angular 17+

export const UserStore = signalStore(
  { providedIn: 'root' },
  withState<UserState>({ users: [], loading: false, error: null }),
  withComputed(({ users }) => ({
    activeUsers: computed(() => users().filter(u => u.active)),
    userCount: computed(() => users().length),
  })),
  withMethods((store, http = inject(HttpClient)) => ({
    loadUsers: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() => http.get<User[]>('/api/users').pipe(
          tapResponse({
            next: (users) => patchState(store, { users, loading: false }),
            error: (error: Error) => patchState(store, { error: error.message, loading: false }),
          }),
        )),
      ),
    ),
    addUser(user: User) {
      patchState(store, { users: [...store.users(), user] });
    },
  })),
);

// Component usage — clean and simple
@Component({
  template: `
    <div *ngIf="store.loading()">Loading...</div>
    <div *ngFor="let user of store.activeUsers()">{{ user.name }}</div>
  `,
})
export class UserListComponent {
  readonly store = inject(UserStore);
  
  constructor() { this.store.loadUsers(); }
}
```

### Comparison Matrix
| Feature | NgRx | Akita | Signal Store |
|---|---|---|---|
| **Pattern** | Redux (FP) | OOP | Functional + Signals |
| **Boilerplate** | High (5 files) | Medium (3 files) | Low (1 file) |
| **DevTools** | Excellent | Good | Good |
| **Learning curve** | Steep | Medium | Easy |
| **Entity support** | @ngrx/entity | Built-in | withEntities() |
| **Angular version** | Any | Any | 17+ |
| **Bundle size** | Larger | Medium | Small |
| **Team** | Large teams | Medium teams | Any size |
| **Maintenance** | Active | Declining | Active (NGRX team) |

### Decision Guide
```
Small app, local state?     → Signals (no library needed)
Medium app, shared state?   → SignalStore (Angular 17+) or simple services
Large enterprise, strict?   → NgRx (strong patterns, DevTools, team consistency)
Existing Akita codebase?    → Migrate to SignalStore gradually
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"NgRx for large enterprise apps needing strict patterns and DevTools. SignalStore for Angular 17+ projects — minimal boilerplate, signals-based, composable. Akita was good but declining. I'd start with SignalStore for new projects at SAP, migrate NgRx features gradually. For simple state, plain Angular Signals in services suffice."*

## 4. 🧠 MEMORY AID
**"NgRx = enterprise Redux (5 files). Akita = OOP-friendly (declining). SignalStore = signals+functional (1 file, future). Use smallest tool that fits."**
