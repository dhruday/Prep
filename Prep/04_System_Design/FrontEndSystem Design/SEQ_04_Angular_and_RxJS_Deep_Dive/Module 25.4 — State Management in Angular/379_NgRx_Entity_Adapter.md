# 379 – NgRx Entity Adapter

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**@ngrx/entity** provides a standardized way to manage collections of entities (CRUD). **EntityAdapter** normalizes arrays into `{ ids: [], entities: {} }` dictionary format for O(1) lookups. Generates pre-built selectors and reducer helpers — eliminates boilerplate for list management.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── ENTITY STATE SHAPE ────
// Instead of User[], entity adapter normalizes to:
// {
//   ids: [1, 2, 3],
//   entities: {
//     1: { id: 1, name: 'Hruday' },
//     2: { id: 2, name: 'Alice' },
//     3: { id: 3, name: 'Bob' },
//   }
// }

// ──── SETUP ────
export interface UserState extends EntityState<User> {
  loading: boolean;
  selectedId: number | null;
}

export const userAdapter: EntityAdapter<User> = createEntityAdapter<User>({
  selectId: (user) => user.id,       // default: entity.id
  sortComparer: (a, b) => a.name.localeCompare(b.name), // optional sort
});

const initialState: UserState = userAdapter.getInitialState({
  loading: false,
  selectedId: null,
});

// ──── REDUCER WITH ADAPTER METHODS ────
export const userReducer = createReducer(
  initialState,
  on(loadUsersSuccess, (state, { users }) =>
    userAdapter.setAll(users, { ...state, loading: false }),
  ),
  on(addUser, (state, { user }) =>
    userAdapter.addOne(user, state),
  ),
  on(updateUser, (state, { update }) =>
    userAdapter.updateOne(update, state),
    // update = { id: 1, changes: { name: 'New Name' } }
  ),
  on(deleteUser, (state, { id }) =>
    userAdapter.removeOne(id, state),
  ),
  on(upsertUser, (state, { user }) =>
    userAdapter.upsertOne(user, state), // add or update
  ),
);

// ──── ADAPTER METHODS ────
// addOne, addMany         — add entities
// setOne, setAll          — replace entities
// updateOne, updateMany   — partial update { id, changes }
// upsertOne, upsertMany   — add or update
// removeOne, removeMany, removeAll
// mapOne, map             — transform entities

// ──── SELECTORS (auto-generated) ────
const { selectAll, selectEntities, selectIds, selectTotal } =
  userAdapter.getSelectors();

export const selectUserState = createFeatureSelector<UserState>('users');
export const selectAllUsers = createSelector(selectUserState, selectAll);
export const selectUserEntities = createSelector(selectUserState, selectEntities);
export const selectUserCount = createSelector(selectUserState, selectTotal);
export const selectSelectedUser = createSelector(
  selectUserState,
  (state) => state.selectedId ? state.entities[state.selectedId] : null,
);

// ──── COMPONENT USAGE ────
@Component({
  template: `
    <div>Total: {{ userCount$ | async }}</div>
    <div *ngFor="let user of users$ | async">{{ user.name }}</div>
  `,
})
export class UserListComponent {
  users$ = this.store.select(selectAllUsers);
  userCount$ = this.store.select(selectUserCount);
  
  constructor(private store: Store) {}
  
  deleteUser(id: number) {
    this.store.dispatch(deleteUser({ id }));
  }
}
```

### Why Entity Adapter?
| Without Adapter | With Adapter |
|---|---|
| Manual array find/filter/map | O(1) entity lookup |
| Write CRUD reducer logic | Pre-built methods |
| Custom selectors | Auto-generated selectors |
| Risk of mutation bugs | Immutable by design |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"EntityAdapter normalizes collections into ids+entities dictionary for O(1) lookups. It provides addOne, updateOne, removeOne etc. — eliminates CRUD reducer boilerplate. Auto-generates selectAll, selectEntities, selectTotal selectors. At Oracle, entity adapter managed our large product catalog state."*

## 4. 🧠 MEMORY AID
**"EntityAdapter = { ids: [], entities: {} }. Methods: addOne, updateOne, removeOne, upsertOne, setAll. Auto-selectors: selectAll, selectTotal."**
