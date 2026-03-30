# 378 – NgRx – Store, Actions, Reducers, Effects, Selectors

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**NgRx** is Angular's Redux-inspired state management. **Store** holds global state. **Actions** describe events. **Reducers** produce new state (pure functions). **Effects** handle side effects (API calls). **Selectors** derive/compose state slices. Unidirectional flow: Component → Action → Reducer → Store → Selector → Component.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── ACTIONS ────
// actions/user.actions.ts
export const loadUsers = createAction('[User Page] Load Users');
export const loadUsersSuccess = createAction(
  '[User API] Load Users Success',
  props<{ users: User[] }>(),
);
export const loadUsersFailure = createAction(
  '[User API] Load Users Failure',
  props<{ error: string }>(),
);

// ──── REDUCER ────
// reducers/user.reducer.ts
export interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
}

const initialState: UserState = { users: [], loading: false, error: null };

export const userReducer = createReducer(
  initialState,
  on(loadUsers, (state) => ({ ...state, loading: true, error: null })),
  on(loadUsersSuccess, (state, { users }) => ({ ...state, users, loading: false })),
  on(loadUsersFailure, (state, { error }) => ({ ...state, error, loading: false })),
);

// ──── EFFECTS ────
// effects/user.effects.ts
@Injectable()
export class UserEffects {
  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUsers),
      switchMap(() =>
        this.userService.getAll().pipe(
          map(users => loadUsersSuccess({ users })),
          catchError(error => of(loadUsersFailure({ error: error.message }))),
        ),
      ),
    ),
  );

  constructor(
    private actions$: Actions,
    private userService: UserService,
  ) {}
}

// ──── SELECTORS ────
// selectors/user.selectors.ts
export const selectUserState = createFeatureSelector<UserState>('users');
export const selectAllUsers = createSelector(selectUserState, state => state.users);
export const selectLoading = createSelector(selectUserState, state => state.loading);
export const selectActiveUsers = createSelector(
  selectAllUsers,
  users => users.filter(u => u.active),
);

// Composed selector
export const selectUserSummary = createSelector(
  selectAllUsers,
  selectLoading,
  (users, loading) => ({ count: users.length, loading }),
);

// ──── COMPONENT ────
@Component({
  template: `
    <div *ngIf="loading$ | async">Loading...</div>
    <div *ngFor="let user of users$ | async">{{ user.name }}</div>
  `,
})
export class UserListComponent implements OnInit {
  users$ = this.store.select(selectAllUsers);
  loading$ = this.store.select(selectLoading);

  constructor(private store: Store) {}

  ngOnInit() {
    this.store.dispatch(loadUsers());
  }
}

// ──── REGISTRATION ────
// app.config.ts (standalone)
bootstrapApplication(AppComponent, {
  providers: [
    provideStore({ users: userReducer }),
    provideEffects(UserEffects),
    provideStoreDevtools({ maxAge: 25 }),
  ],
});
```

### NgRx Flow
```
Component ──dispatch──> Action ──> Reducer ──> Store
    ↑                                           |
    └───── select ←── Selector ←────────────────┘
                        
    Action ──> Effect ──> API ──> dispatch Success/Failure
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"NgRx follows Redux pattern: actions describe events, reducers produce immutable state, effects handle side effects like API calls, selectors compose derived data. I use it for complex shared state. Key patterns: action naming '[Source] Event', switchMap in effects for latest-wins, memoized selectors for performance."*

## 4. 🧠 MEMORY AID
**"NgRx = Action → Reducer (pure) → Store → Selector → Component. Effects = side effects (API). 'ARSES' = Actions, Reducers, Store, Effects, Selectors."**
