# 456 – Normalizing State Shape — Entity Adapter

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Normalization** stores entities as `{ ids: [], entities: {} }` instead of arrays. Lookups are O(1), updates don't require array scans. **Entity Adapter** (RTK) provides CRUD operations and selectors for normalized state. Prevents duplicate data, simplifies relational data.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
import { createEntityAdapter, createSlice, PayloadAction } from '@reduxjs/toolkit';

// ──── WHY NORMALIZE? ────
// BAD: Array of objects — O(n) lookup, update, delete
const badState = {
  posts: [
    { id: '1', title: 'Post 1', authorId: 'u1' },
    { id: '2', title: 'Post 2', authorId: 'u1' },
    { id: '3', title: 'Post 3', authorId: 'u2' },
  ],
};
// Finding post '2': posts.find(p => p.id === '2') — O(n)

// GOOD: Normalized — O(1) lookup
const goodState = {
  posts: {
    ids: ['1', '2', '3'],
    entities: {
      '1': { id: '1', title: 'Post 1', authorId: 'u1' },
      '2': { id: '2', title: 'Post 2', authorId: 'u1' },
      '3': { id: '3', title: 'Post 3', authorId: 'u2' },
    },
  },
};
// Finding post '2': entities['2'] — O(1)

// ──── ENTITY ADAPTER ────
interface Post {
  id: string;
  title: string;
  authorId: string;
  timestamp: number;
}

const postsAdapter = createEntityAdapter<Post>({
  // Optional: custom ID field (default: 'id')
  selectId: (post) => post.id,
  // Sort order
  sortComparer: (a, b) => b.timestamp - a.timestamp,
});

// Initial state: { ids: [], entities: {} }
const initialState = postsAdapter.getInitialState({
  loading: false,
  error: null as string | null,
});

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    // CRUD operations — all provided by adapter
    postAdded: postsAdapter.addOne,
    postsReceived: postsAdapter.setAll,
    postUpdated: postsAdapter.updateOne,
    postRemoved: postsAdapter.removeOne,
    postsUpserted: postsAdapter.upsertMany,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.fulfilled, (state, action) => {
        postsAdapter.setAll(state, action.payload);
        state.loading = false;
      });
  },
});

// ──── ADAPTER METHODS ────
// addOne(state, entity)       — add single entity
// addMany(state, entities)    — add multiple
// setAll(state, entities)     — replace all
// updateOne(state, { id, changes }) — update fields
// upsertOne(state, entity)    — add or update
// removeOne(state, id)        — remove by ID
// removeMany(state, ids)      — remove multiple
// removeAll(state)            — clear all

// ──── SELECTORS ────
const {
  selectAll,       // returns sorted array
  selectById,      // returns entity or undefined
  selectIds,       // returns ID array
  selectEntities,  // returns entity map
  selectTotal,     // returns count
} = postsAdapter.getSelectors((state: RootState) => state.posts);

// Usage in components
function PostList() {
  const posts = useAppSelector(selectAll);
  const total = useAppSelector(selectTotal);
  
  return (
    <div>
      <h2>{total} Posts</h2>
      {posts.map(p => <PostCard key={p.id} post={p} />)}
    </div>
  );
}

function SinglePost({ id }: { id: string }) {
  const post = useAppSelector(state => selectById(state, id));
  if (!post) return <NotFound />;
  return <h1>{post.title}</h1>;
}

// ──── RELATIONAL DATA ────
// Normalize related entities separately
const state = {
  users: {
    ids: ['u1', 'u2'],
    entities: { u1: { id: 'u1', name: 'Hruday' }, u2: { id: 'u2', name: 'Alice' } },
  },
  posts: {
    ids: ['p1', 'p2'],
    entities: {
      p1: { id: 'p1', title: 'Post 1', authorId: 'u1' },
      p2: { id: 'p2', title: 'Post 2', authorId: 'u2' },
    },
  },
  comments: {
    ids: ['c1'],
    entities: { c1: { id: 'c1', postId: 'p1', authorId: 'u2', text: 'Nice!' } },
  },
};
// Join: state.users.entities[post.authorId].name
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Normalization stores { ids: [], entities: {} } — O(1) lookups, no duplicates. Entity Adapter provides CRUD (addOne, updateOne, removeOne, upsertMany) and selectors (selectAll, selectById, selectTotal). sortComparer for ordering. Store relational data in separate slices, reference by ID."*

## 4. 🧠 MEMORY AID
**"Normalize: { ids: [], entities: {} }. Entity Adapter: addOne, setAll, updateOne, removeOne + selectAll, selectById. O(1) lookup. Relations = separate slices + IDs."**
