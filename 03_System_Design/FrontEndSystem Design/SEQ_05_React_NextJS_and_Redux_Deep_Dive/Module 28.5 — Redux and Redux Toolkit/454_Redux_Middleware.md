# 454 – Redux Middleware — Thunk, Saga, Observable

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Middleware sits between `dispatch` and the reducer. **Thunk** = functions as actions (async logic). **Saga** = generator-based side effects (complex flows). **Observable** = RxJS-based (reactive streams). Thunk is simplest and default in RTK. Saga for complex orchestration. Observable for reactive.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── REDUX THUNK (default in RTK) ────
import { createAsyncThunk } from '@reduxjs/toolkit';

// createAsyncThunk handles pending/fulfilled/rejected
const fetchPosts = createAsyncThunk(
  'posts/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/posts');
      if (!response.ok) throw new Error('Failed');
      return (await response.json()) as Post[];
    } catch (err) {
      return rejectWithValue('Failed to fetch posts');
    }
  },
);

// Handle in slice
const postsSlice = createSlice({
  name: 'posts',
  initialState: { items: [] as Post[], loading: false, error: null as string | null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => { state.loading = true; })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Dispatch
dispatch(fetchPosts()); // returns Promise<Post[]>

// Manual thunk (for complex logic)
const addPostAndNavigate = (post: Post) => async (dispatch: AppDispatch, getState: () => RootState) => {
  await dispatch(addPost(post));
  const count = getState().posts.items.length;
  if (count > 10) dispatch(showNotification('Lots of posts!'));
};

// ──── REDUX SAGA (generator-based) ────
import { call, put, takeLatest, takeEvery, all, fork } from 'redux-saga/effects';

function* fetchPostsSaga(): Generator {
  try {
    yield put({ type: 'posts/loading' });
    const response = yield call(fetch, '/api/posts');
    const posts = yield call([response, 'json']);
    yield put({ type: 'posts/loaded', payload: posts });
  } catch (error) {
    yield put({ type: 'posts/error', payload: error.message });
  }
}

// Watchers
function* watchFetchPosts() {
  yield takeLatest('posts/fetch', fetchPostsSaga); // cancel previous
}

// Complex: sequential operations
function* checkoutSaga(action) {
  const cart = yield select(state => state.cart);
  const payment = yield call(processPayment, cart, action.payload);
  yield put(clearCart());
  yield call(sendConfirmation, payment.id);
  yield put(showSuccess('Order placed!'));
}

// Root saga
function* rootSaga() {
  yield all([
    fork(watchFetchPosts),
    fork(watchCheckout),
  ]);
}

// ──── REDUX OBSERVABLE (RxJS-based) ────
import { ofType } from 'redux-observable';
import { switchMap, map, catchError, debounceTime } from 'rxjs/operators';
import { of, from } from 'rxjs';

// Epic: action in → action(s) out
const fetchPostsEpic = (action$: Observable<Action>) =>
  action$.pipe(
    ofType('posts/fetch'),
    debounceTime(300),
    switchMap(() =>
      from(fetch('/api/posts').then(r => r.json())).pipe(
        map(posts => ({ type: 'posts/loaded', payload: posts })),
        catchError(err => of({ type: 'posts/error', payload: err.message })),
      ),
    ),
  );

// Combine epics
const rootEpic = combineEpics(fetchPostsEpic, searchEpic);
```

### Comparison
| Feature | Thunk | Saga | Observable |
|---|---|---|---|
| Learning curve | Low | High | High |
| Async pattern | async/await | Generators | RxJS |
| Cancellation | manual | built-in (takeLatest) | switchMap |
| Testing | mock fetch | call() effects | marble testing |
| Best for | Simple async | Complex orchestration | Reactive streams |
| RTK support | Built-in | Separate | Separate |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Thunk (RTK default): dispatch functions for async — createAsyncThunk handles pending/fulfilled/rejected. Saga: generators with call/put/takeLatest for complex flows (sequential, cancellation, retry). Observable: RxJS epics for reactive patterns (debounce, switchMap, merge). Use Thunk unless you need Saga's orchestration or Observable's reactivity."*

## 4. 🧠 MEMORY AID
**"Thunk = async/await (simple). Saga = generators (complex, cancellation). Observable = RxJS (reactive, streams). Default: Thunk via createAsyncThunk."**
