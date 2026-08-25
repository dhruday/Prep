# 73. State Normalization

## 1. High-Level Explanation (Frontend Interview Level)

**State normalization** is the practice of storing related entities once, by their unique ID, instead of duplicating them across multiple response-shaped data blobs. A non-normalized store might have `byId.users['u1']` and `feedPosts[0].author` (a copy of the same user) — when the user updates their avatar, you must remember to update both locations or the UI becomes inconsistent. A normalized store keeps a single canonical `users['u1']` record; both the feed and the profile page reference the same object. This pattern comes directly from relational database theory (3NF) applied to frontend state management. It's essential for any frontend application that displays the same entity in multiple contexts simultaneously — social feeds, dashboards, admin panels, chat applications.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### The Problem — Duplicated Entities Diverge

```typescript
// Non-normalized store
const state = {
  profile: {
    user: { id: 'u1', name: 'Hruday D', avatar: '/old.jpg' }    // copy 1
  },
  feed: {
    posts: [
      { id: 'p1', body: '...', author: { id: 'u1', name: 'Hruday D', avatar: '/old.jpg' } },  // copy 2
      { id: 'p2', body: '...', author: { id: 'u1', name: 'Hruday D', avatar: '/new.jpg' } },  // copy 3 — stale!
    ]
  },
  comments: {
    // ^ another copy of user in each comment
  }
};

// User changes avatar → must update 5, 10, N copies
// Miss one → inconsistent UI (user sees their old avatar in one place)
```

### The Solution — Single Source of Truth by ID

```typescript
// Normalized store
const state = {
  entities: {
    users: {
      'u1': { id: 'u1', name: 'Hruday D', avatar: '/new.jpg' },  // one copy
    },
    posts: {
      'p1': { id: 'p1', body: '...', authorId: 'u1' },
      'p2': { id: 'p2', body: '...', authorId: 'u1' },
    },
  },
  ids: {
    feedPostIds: ['p2', 'p1'],        // ordered list for the feed
  },
};

// Update user avatar:
state.entities.users['u1'].avatar = '/newer.jpg';
// ↑ BOTH posts now show the updated avatar — they reference by ID, not by copy
```

### Normalization Libraries

**Option 1: Normalizr (manual normalization)**
```typescript
import { normalize, schema } from 'normalizr';

// Define entity schemas
const user = new schema.Entity('users');
const post = new schema.Entity('posts', { author: user });
const feed = new schema.Array(post);

// API response (nested shape)
const response = {
  posts: [
    { id: 'p1', body: '...', author: { id: 'u1', name: 'Hruday', avatar: '/a.jpg' } },
    { id: 'p2', body: '...', author: { id: 'u1', name: 'Hruday', avatar: '/a.jpg' } },
  ]
};

// Normalize: flatten entities, replace nested objects with IDs
const { entities, result } = normalize(response.posts, feed);

//  entities.users = { 'u1': { id: 'u1', name: 'Hruday', avatar: '/a.jpg' } }
//  entities.posts = {
//    'p1': { id: 'p1', body: '...', author: 'u1' },    ← author is now an ID string
//    'p2': { id: 'p2', body: '...', author: 'u1' },
//  }
//  result = ['p1', 'p2']                                ← ordered IDs
```

**Option 2: createEntityAdapter (NgRx / RTK)**
```typescript
// @ngrx/entity and Redux Toolkit both provide createEntityAdapter
import { createEntityAdapter } from '@ngrx/entity';

const usersAdapter = createEntityAdapter<User>({
  selectId: (user) => user.id,
  sortComparer: false,   // no sorting — preserve insertion order
});

// Adapter manages the { ids: [], entities: {} } shape
// ids: maintains the ordered ID array
// entities: Record<string, User> — the dictionary indexed by ID

const state = usersAdapter.setAll(apiUsers, usersAdapter.getInitialState());
// state = { ids: ['u1', 'u2'], entities: { u1: {...}, u2: {...} } }

const user = state.entities['u1'];          // O(1) lookup by ID
const allUsers = usersAdapter.getSelectors().selectAll(state);  // back to array
```

### Denormalization — Joining at Read Time

Normalized storage means you must join entities when rendering:

```typescript
// Selector-based denormalization
const selectPostsWithAuthors = createSelector(
  selectAllPosts,
  selectUserEntities,    // Record<string, User>
  (posts, userEntities) =>
    posts.map((post) => ({
      ...post,
      author: userEntities[post.authorId],   // join at selector level
    }))
);
// Result is memoised — recomputes only when posts or users change
// Downstream component only re-renders when selectPostsWithAuthors output changes
```

### Normalization in Apollo/Relay (GraphQL)

Apollo Client's `InMemoryCache` normalizes automatically by `__typename + id`:

```typescript
// API returns:
{
  "__typename": "User",
  "id": "u1",
  "name": "Hruday",
  "posts": [
    { "__typename": "Post", "id": "p1", "body": "..." }
  ]
}

// Apollo cache stores:
// ROOT_QUERY → { "user(id:u1)": { __ref: "User:u1" } }
// User:u1    → { id: "u1", name: "Hruday", posts: [{ __ref: "Post:p1" }] }
// Post:p1    → { id: "p1", body: "..." }

// Mutation updates User:u1.name → ALL queries that reference User:u1 auto-update
// No need for manual invalidation — normalised cache handles it
```

### When NOT to Normalize

Normalization has costs: more complex selectors, denormalization overhead, additional boilerplate. Do NOT normalize:
- **Leaf level data** (strings, numbers, simple value objects without IDs)
- **Immutable reference data** that never changes (country list, currency list)
- **Non-entity data**: pagination metadata, loading states, form state
- **Small datasets** where duplication is negligible and join complexity is not worth it
- **Temporary UI data** that maps 1:1 with a single component

---

## 3. Real-World Examples

**Facebook/Instagram newsfeed:** Every post has an author, comments have authors, each comment thread has nested replies with further authors. Facebook's Relay normalises ALL entities — User, Post, Comment — into a flat graph. A user name change propagates to every location in one cache update, critical for 3 billion users with active data across tens of screens.

**GitHub Pull Requests:** A PR page shows: author, reviewers (all User entities), referenced issues (Issue entities), linked commits (Commit entities). GitHub's frontend normalises all entities so that a user profile update (new avatar) propagates across the PR timeline, reviewer list, and sidebar without any re-fetch.

**At Hruday's SAP environment:** SAP BI reports share datasets, filters, and user references. If a user renames a shared dimension (e.g., "Revenue" → "Net Revenue"), all reports referencing that dimension must reflect the change. Normalized state — `dimensions['dim1']` referenced by ID in `reports['r1'].dimensionIds` — means one update propagates everywhere vs. updating each report's nested copy of the dimension.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "State normalization stores each entity once by its unique ID, replacing nested duplicates with ID references — the same pattern as relational database normalization. In React/Redux, I use NgRx `EntityAdapter` or Redux Toolkit's `createEntityAdapter` — both produce `{ ids: string[], entities: Record<string, T> }` and provide O(1) lookups. Denormalization happens in selectors with `createSelector`, which is memoised so joins are only recomputed when input entities change. Apollo Client normalises automatically by `__typename + id` — a mutation updating User:42 automatically updates all queries referencing that user. The trade-off: added selector complexity vs. the benefit of zero inconsistency risk for shared entities."

**Likely Follow-up Questions:**
1. What is the N+1 problem in frontend state? → When you have posts[0...n] and for each post you look up the author by issuing a separate fetch. Normalized state solves this by having all users pre-loaded; denormalize via selector (O(1) per lookup, no fetch).
2. How do you handle entity relationships — many-to-many? → Normalize as a join table: `postTags: { 'pt1': { postId: 'p1', tagId: 't3' } }` or use arrays of IDs: `post.tagIds: ['t2', 't3']`. Selectors join at read time.
3. When do you use Normalizr vs built-in adapter? → Normalizr for one-off transformation of deeply nested API responses without Redux/NgRx. `createEntityAdapter` / NgRx EntityAdapter for managing the entities in the Redux store with CRUD operations.

---

## 5. Code Example

```typescript
// Example: normalized comments state with nested replies

interface CommentsState {
  byId: Record<string, Comment>;
  topLevelIds: string[];           // ordered IDs for the top-level comment thread
  repliesByParentId: Record<string, string[]>;  // parentId → reply IDs
  loading: boolean;
}

function denormalizeComments(state: CommentsState, parentId: string | null = null): CommentWithReplies[] {
  const ids = parentId
    ? state.repliesByParentId[parentId] ?? []
    : state.topLevelIds;
    
  return ids.map(id => ({
    ...state.byId[id],
    replies: denormalizeComments(state, id),  // recursive denormalization
  }));
}

// Selector version (memoised for Redux):
const selectTopLevelCommentsTree = createSelector(
  (s: RootState) => s.comments,
  (commentsState) => denormalizeComments(commentsState, null)
);
```

---

## 6. Memory Aid

**Normalize = database tables in the browser.** foreign keys (IDs) instead of embedded objects. One row per entity, never duplicated.

**The three signs you need normalization:**
1. Same entity appears in multiple parts of state
2. Mutation requires searching multiple places to update
3. UI shows inconsistent data for the same entity in different components

---

## 7. Why & How Summary

**Why it matters:** Inconsistency in multi-context entity display is one of the most common and subtle user-facing bugs in complex SPAs. Normalization eliminates the entire class of "user changed X but it still shows old X in the sidebar" bugs. It also makes updates O(1) (modify one record by ID) vs O(n) (scan all arrays looking for the entity).

**How it works:** Entities are stored in a dictionary (object/Map) keyed by their unique ID. Lists are stored as arrays of IDs pointing into the dictionary. When rendering, selectors join IDs to entities at read time. Libraries like `createEntityAdapter` provide the reducer functions (addOne, updateOne, etc.) that maintain the normalised shape. Apollo/Relay automate normalisation by reading `__typename` and `id` fields from every GraphQL response.

**Company relevance:**
- Microsoft: Azure Portal's resource inventory is normalised — VMs, disks, networks all cross-reference each other by ID
- Adobe: Asset Management views (Photoshop, Illustrator cloud libraries) normalise assets, versions, and collaborator users
- Salesforce: CRM data (leads, contacts, accounts, opportunities) is inherently relational — normalised state maps directly to the underlying Salesforce data model
- Cisco: Network device topology is a graph — devices (by MAC/serial), interfaces, and VLANs normalised with ID references maps directly to graph-based state management
