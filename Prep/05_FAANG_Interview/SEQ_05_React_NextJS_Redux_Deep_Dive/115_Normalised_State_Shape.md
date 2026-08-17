# 115. Normalised State Shape — Why and How
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Normalized state shape stores data as a flat lookup table (dictionary indexed by ID) rather than as nested arrays. Instead of `[{ id: '1', user: { id: 'u1', name: '...' }, comments: [...] }]`, you store `{ posts: { ids: ['1'], entities: { '1': { id: '1', userId: 'u1', commentIds: ['c1'] } } }, users: { ... }, comments: { ... } }`. The benefits: O(1) lookup by ID (no array scanning), no duplicate data (a user object appears once regardless of how many posts they authored), UI updates to a single entity trigger minimal re-renders (only components subscribed to that entity), and relationships are represented by IDs (like a database). Redux Toolkit's `createEntityAdapter` implements this pattern. It mirrors how relational databases normalize data — exactly the same motivation.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Problem with Nested/Denormalized State

```typescript
// ❌ Denormalized (nested) state
interface DenormalizedState {
  posts: Array<{
    id: string;
    title: string;
    author: {
      id: string;
      name: string;
      avatar: string;
    };
    comments: Array<{
      id: string;
      text: string;
      by: {
        id: string;
        name: string;
        avatar: string;
      };
    }>;
  }>;
}

// Problems:
// 1. Duplicate data: if user 'alice' writes 50 posts, her data appears 50 times
// 2. Inconsistency: updating alice's avatar requires finding ALL her occurrences
// 3. O(n) lookup: finding post by ID = scan entire array
// 4. Deep nesting = complex reducers: updating a comment requires:
//    posts.map(p => p.id === postId
//      ? { ...p, comments: p.comments.map(c => c.id === commentId ? newComment : c) }
//      : p
//    )
// 5. Over-fetching: selecting a comment author rerenders when unrelated post changes

// The inconsistency bug scenario:
// User changes username → update ONE place in denormalized state
// Developer forgets to update it in a nested array → stale data shown in some components
```

### Normalized State Structure

```typescript
// ✅ Normalized: separate entity tables, related by ID

interface NormalizedState {
  posts: {
    ids: string[];     // ordered list of IDs (for rendering in order)
    entities: {
      [id: string]: {
        id: string;
        title: string;
        authorId: string;    // FK reference — not embedded user object
        commentIds: string[]; // FK references — not embedded comments
      };
    };
  };
  users: {
    ids: string[];
    entities: {
      [id: string]: {
        id: string;
        name: string;
        avatar: string;
        // NOT including posts or comments here — unidirectional FK
      };
    };
  };
  comments: {
    ids: string[];
    entities: {
      [id: string]: {
        id: string;
        text: string;
        postId: string;   // FK back-reference
        authorId: string; // FK to user
      };
    };
  };
}

// Benefits:
// 1. Get post by ID: state.posts.entities[postId]  → O(1)
// 2. Get user by ID: state.users.entities[userId]  → O(1)
// 3. User data stored ONCE regardless of post count → no duplicates
// 4. Update user avatar → one place → all components that use that user reflect update
// 5. Shallow updates trigger precise selector re-renders
```

### Normalizing API Responses — normalizr

```typescript
// normalizr: transforms nested API responses → normalized state
import { schema, normalize } from 'normalizr';

// Define schemas
const userSchema = new schema.Entity('users');
const commentSchema = new schema.Entity('comments', {
  by: userSchema,  // 'by' field is a user
});
const postSchema = new schema.Entity('posts', {
  author: userSchema,
  comments: [commentSchema],  // array of comments
});

// Raw API response (nested/denormalized)
const apiResponse = {
  id: '1',
  title: 'My Post',
  author: { id: 'u1', name: 'Alice', avatar: '/alice.jpg' },
  comments: [
    { id: 'c1', text: 'Great!', by: { id: 'u2', name: 'Bob', avatar: '/bob.jpg' } },
    { id: 'c2', text: 'Thanks!', by: { id: 'u1', name: 'Alice', avatar: '/alice.jpg' } },
  ],
};

// Normalize it
const normalized = normalize(apiResponse, postSchema);
// Result:
// {
//   result: '1',  ← top-level ID
//   entities: {
//     posts: { '1': { id: '1', title: 'My Post', author: 'u1', comments: ['c1', 'c2'] } },
//     users: { 'u1': { id: 'u1', name: 'Alice', avatar: '/alice.jpg' },
//              'u2': { id: 'u2', name: 'Bob', avatar: '/bob.jpg' } },
//     comments: { 'c1': { id: 'c1', text: 'Great!', by: 'u2' },
//                 'c2': { id: 'c2', text: 'Thanks!', by: 'u1' } },
//   }
// }

// Note: Alice appears ONCE in entities.users even though she's in two places in original data
```

### RTK createEntityAdapter — Built-in Normalization

```typescript
import { createEntityAdapter, createSlice, createSelector } from '@reduxjs/toolkit';

interface Post {
  id: string;
  title: string;
  body: string;
  authorId: string;
  commentIds: string[];
}

const postsAdapter = createEntityAdapter<Post>({
  sortComparer: (a, b) => a.title.localeCompare(b.title),
});

const postsSlice = createSlice({
  name: 'posts',
  initialState: postsAdapter.getInitialState(),
  reducers: {
    postAdded: postsAdapter.addOne,
    postsLoaded: postsAdapter.setAll,
    postUpdated: postsAdapter.updateOne,
    postRemoved: postsAdapter.removeOne,
  },
});

// Generated state shape:
// { ids: ['p1', 'p2'], entities: { p1: {...}, p2: {...} } }

// Selectors from adapter
const postSelectors = postsAdapter.getSelectors<RootState>(s => s.posts);

// ========================
// Joining normalized data in selectors (like SQL JOIN)
// ========================
interface PostWithAuthor extends Post {
  author: User;
}

export const selectPostsWithAuthors = createSelector(
  [postSelectors.selectAll, (state: RootState) => state.users.entities],
  (posts, userEntities): PostWithAuthor[] =>
    posts.map(post => ({
      ...post,
      author: userEntities[post.authorId]!,  // "join" user data
    }))
);

export const selectPostById = (id: string) =>
  createSelector(
    [(state: RootState) => postSelectors.selectById(state, id), (state: RootState) => state.users.entities],
    (post, userEntities) =>
      post ? { ...post, author: userEntities[post.authorId] } : null
  );
```

### Handling Updates — Normalized vs Denormalized

```typescript
// ❌ Denormalized: updating a username is a nightmare
function updateUsernameReducer(state: DenormalizedState, action: { userId: string; name: string }) {
  return {
    ...state,
    posts: state.posts.map(post => ({
      ...post,
      author: post.author.id === action.userId
        ? { ...post.author, name: action.name }
        : post.author,
      comments: post.comments.map(comment => ({
        ...comment,
        by: comment.by.id === action.userId
          ? { ...comment.by, name: action.name }
          : comment.by,
      })),
    })),
  };
}
// O(posts × comments) traversal. Misses if user is stored in other places.

// ✅ Normalized: updating a username = one operation
usersAdapter.updateOne(state, {
  id: action.userId,
  changes: { name: action.name },
});
// O(1). All selectors that join this user data automatically reflect the change.
```

### When NOT to Normalize

```typescript
// Normalization adds complexity — don't apply it everywhere
// Skip normalization for:

// 1. Small, static lists (< 20 items unlikely to change individually)
const countriesSlice = createSlice({
  name: 'countries',
  initialState: [] as Country[],  // array is fine — never update individual countries
  reducers: { loaded: (state, action) => action.payload },
});

// 2. Form state (belongs in local component state or react-hook-form, not Redux)

// 3. Single entity (user profile, app settings)
const userProfileSlice = createSlice({
  name: 'userProfile',
  initialState: null as User | null,  // single object — normalization unnecessary
  reducers: { loaded: (state, action) => action.payload },
});

// 4. Data that's never individually accessed by ID
//   (e.g., audit log — you always display all of them)

// Normalize when:
// ✅ Large collections (50+ items)
// ✅ Items are frequently updated individually
// ✅ Multiple features access the same entities
// ✅ Relationships between entities (posts ↔ users ↔ comments)
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP Labs, the product catalog (30,000+ SKUs) was stored as a nested array. `mapStateToProps` called `.find()` for every table row render — profiling revealed 8ms selector time per row × 60 rows visible = 480ms per render cycle on table scroll. Normalizing with `createEntityAdapter` reduced per-row selector time to 0.1ms (direct `entities[id]` lookup) — an 80× improvement that eliminated scroll jank entirely.

The user-relationship problem: product reviews had embedded user objects. When a user updated their display name, the Redux store had stale names in 300+ review objects. Normalization (reviews reference `userId`, selectors join) solved the stale data issue completely — one update to the `users` slice, all review selectors automatically reflect the new name.

**At FAANG scale:**
- **Microsoft:** Teams normalizes message threads — messages are a flat entity table keyed by ID; threads, channels, and chats reference message IDs. Updating a single message doesn't require touching channel or thread data structures
- **Adobe:** Experience Platform's schema registry uses normalized state for field definitions that are reused across multiple schemas
- **Salesforce:** CRM data (accounts, contacts, opportunities) is normalized — contacts reference accountId, opportunities reference contactId, enabling O(1) lookups during sales pipeline renders

---

## 💬 4. Interview Execution

### Sample Answer

> "Normalized state treats the Redux store like a relational database: each entity type gets its own lookup table, indexed by ID, and relationships are represented by ID references rather than embedded objects.
>
> The motivation is identical to database normalization: eliminate duplicates, enable consistent updates, and enable O(1) lookups. If I store a user object inside every post they wrote, and they change their avatar, I need to update that avatar in every post — O(n) update and a common bug. With normalized state, the user exists once; selecting a post's author is a JOIN in a selector.
>
> For performance: arrays require `.find(p => p.id === id)` — O(n). Normalized state: `entities[id]` — O(1). For a 500-item list with 60 items visible, this is the difference between smooth scrolling and jank.
>
> In practice, I use `createEntityAdapter` from Redux Toolkit — it implements the pattern with a built-in `{ ids, entities }` structure and provides pre-built CRUD operations and memoized selectors (`selectAll`, `selectById`). For API responses that arrive nested/denormalized, `normalizr` transforms them into the normalized shape before storing.
>
> I don't normalize everything — small static lists, single entities, and form state don't need it. The cost-benefit makes sense for large mutable collections with relationships."

---

## 💻 5. Code Example

```typescript
// ========================
// Before normalization: blog post feed with users + comments
// ========================

// ❌ Before: deep nested state
interface DenormPost {
  id: string;
  title: string;
  author: { id: string; name: string };
  comments: { id: string; text: string; author: { id: string; name: string } }[];
}
let denormState: DenormPost[] = [];

// Finding a comment: O(posts × comments)
function findComment(postId: string, commentId: string) {
  const post = denormState.find(p => p.id === postId);  // O(n)
  return post?.comments.find(c => c.id === commentId);  // O(m)
}

// ✅ After: full normalized implementation
import { createEntityAdapter, createSlice, createSelector } from '@reduxjs/toolkit';

interface User { id: string; name: string; avatarUrl: string }
interface Comment { id: string; text: string; authorId: string; postId: string }
interface Post { id: string; title: string; body: string; authorId: string; commentIds: string[] }

// Three adapters — three entity tables
const usersAdapter = createEntityAdapter<User>();
const commentsAdapter = createEntityAdapter<Comment>();
const postsAdapter = createEntityAdapter<Post>({
  sortComparer: (a, b) => a.title.localeCompare(b.title),
});

// Slices
const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState(),
  reducers: {
    usersLoaded: usersAdapter.setAll,
    userUpdated: usersAdapter.updateOne,  // update name → one operation, O(1)
  },
});

const commentsSlice = createSlice({
  name: 'comments',
  initialState: commentsAdapter.getInitialState(),
  reducers: {
    commentsLoaded: commentsAdapter.setMany,
    commentAdded: commentsAdapter.addOne,
    commentDeleted: commentsAdapter.removeOne,
  },
});

const postsSlice = createSlice({
  name: 'posts',
  initialState: postsAdapter.getInitialState(),
  reducers: {
    postsLoaded: postsAdapter.setAll,
    commentAddedToPost(state, action: { payload: { postId: string; commentId: string } }) {
      const post = state.entities[action.payload.postId];
      if (post) post.commentIds.push(action.payload.commentId);
    },
  },
});

// Selectors with JOIN
type NormRootState = {
  users: ReturnType<typeof usersSlice.reducer>;
  comments: ReturnType<typeof commentsSlice.reducer>;
  posts: ReturnType<typeof postsSlice.reducer>;
};

const userSelectors = usersAdapter.getSelectors<NormRootState>(s => s.users);
const commentSelectors = commentsAdapter.getSelectors<NormRootState>(s => s.comments);
const postSelectors = postsAdapter.getSelectors<NormRootState>(s => s.posts);

// "SELECT posts.*, users.name as authorName FROM posts JOIN users ON posts.authorId = users.id"
export const selectPostsWithAuthorNames = createSelector(
  [postSelectors.selectAll, (state: NormRootState) => state.users.entities],
  (posts, userEntities) =>
    posts.map(post => ({
      ...post,
      authorName: userEntities[post.authorId]?.name ?? 'Unknown',
    }))
);

// Single post with full comments (nested selectors)
export const selectPostWithComments = (postId: string) =>
  createSelector(
    [
      (state: NormRootState) => postSelectors.selectById(state, postId),
      (state: NormRootState) => state.comments.entities,
      (state: NormRootState) => state.users.entities,
    ],
    (post, commentEntities, userEntities) => {
      if (!post) return null;
      return {
        ...post,
        author: userEntities[post.authorId],
        comments: post.commentIds.map(cId => ({
          ...commentEntities[cId]!,
          author: userEntities[commentEntities[cId]!.authorId],
        })),
      };
    }
  );

export const { usersLoaded, userUpdated } = usersSlice.actions;
export const { commentsLoaded, commentAdded } = commentsSlice.actions;
export const { postsLoaded, commentAddedToPost } = postsSlice.actions;
```

---

## 🧠 6. Memory Aid

**Redux normalized state = database tables in a JavaScript object.**

**The pattern:**
```
{ ids: ['1','2','3'], entities: { '1': {...}, '2': {...}, '3': {...} } }
```
- `ids` = ordered array for iteration
- `entities` = hash map for O(1) lookup

**Normalization rules (simplified):**
1. Each entity type has its own "table"
2. Entities reference each other by ID
3. No nested entity objects (only IDs)

**createEntityAdapter pre-built CRUD:**
`addOne | addMany | setAll | upsertOne | updateOne | removeOne | removeMany`

**Mnemonic:** **DIRT** — **D**eduplicate data, **I**D-indexed lookup, **R**elationships via IDs, **T**riggered joins in selectors.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Performance at scale: the O(n) vs O(1) lookup difference is negligible for 10 items but becomes 480ms render lag for 30,000 SKUs in a table — normalized state is a prerequisite for large-scale list performance
→ Data consistency: denormalized state + partial update = stale data bugs that are hard to reproduce and even harder to trace; normalized state makes it structurally impossible to have inconsistent user data across the UI
→ Selector architecture: understanding normalized state is the prerequisite for writing meaningful `createSelector` joins — without normalization, there's nothing meaningful to compose

**How it works (2 sentences):**
Normalized state restructures data by replacing nested entity objects with their IDs — so instead of a post containing a full user object, it contains `authorId: 'u1'` — and the actual user data lives in a separate flat lookup table (`users.entities['u1']`); when a component needs the post's author, a memoized selector performs the "join" at read time by combining `selectPostById` and `selectUserById`.
`createEntityAdapter` implements this pattern automatically by maintaining `ids` (an ordered array for consistent rendering) and `entities` (a hash map for O(1) access), providing built-in CRUD operations that keep both structures synchronized, and generating `getSelectors()` that return pre-memoized `selectAll` (sorted array from `ids`) and `selectById` (direct hash lookup) functions.

---
✅ Topic 115/486 complete → Continuing to Topic 116: Redux DevTools — Time-Travel Debugging
