# 452 – RTK Query — Data Fetching and Caching

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**RTK Query** = data fetching + caching built into Redux Toolkit. Eliminates useState/useEffect for API calls. Features: automatic caching, deduplication, polling, optimistic updates, cache invalidation with tags, auto-generated hooks. Alternative to React Query/SWR but integrated with Redux.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// ──── DEFINE API ────
const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Post', 'User'], // for cache invalidation
  endpoints: (builder) => ({
    // Query — GET data
    getPosts: builder.query<Post[], void>({
      query: () => '/posts',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Post' as const, id })), 'Post']
          : ['Post'],
    }),
    
    getPostById: builder.query<Post, string>({
      query: (id) => `/posts/${id}`,
      providesTags: (result, error, id) => [{ type: 'Post', id }],
    }),
    
    // Mutation — POST/PUT/DELETE
    addPost: builder.mutation<Post, Partial<Post>>({
      query: (body) => ({
        url: '/posts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Post'], // refetch all posts
    }),
    
    updatePost: builder.mutation<Post, { id: string; changes: Partial<Post> }>({
      query: ({ id, changes }) => ({
        url: `/posts/${id}`,
        method: 'PATCH',
        body: changes,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Post', id }],
    }),
    
    deletePost: builder.mutation<void, string>({
      query: (id) => ({
        url: `/posts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Post', id }],
    }),
  }),
});

// Auto-generated hooks
export const {
  useGetPostsQuery,
  useGetPostByIdQuery,
  useAddPostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
} = api;

// ──── STORE SETUP ────
const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

// ──── USAGE IN COMPONENTS ────
function PostList() {
  const { data: posts, isLoading, error, refetch } = useGetPostsQuery();
  const [addPost, { isLoading: isAdding }] = useAddPostMutation();
  
  if (isLoading) return <Spinner />;
  if (error) return <Error error={error} />;
  
  return (
    <div>
      <button onClick={() => addPost({ title: 'New Post' })} disabled={isAdding}>
        Add Post
      </button>
      {posts?.map(p => <PostCard key={p.id} post={p} />)}
    </div>
  );
}

// ──── POLLING ────
function LiveFeed() {
  const { data } = useGetPostsQuery(undefined, {
    pollingInterval: 5000, // refetch every 5s
    refetchOnMountOrArgChange: true,
    skip: false, // conditional fetching
  });
  return <Feed posts={data} />;
}

// ──── OPTIMISTIC UPDATE ────
updatePost: builder.mutation({
  query: ({ id, changes }) => ({ url: `/posts/${id}`, method: 'PATCH', body: changes }),
  async onQueryStarted({ id, changes }, { dispatch, queryFulfilled }) {
    // Optimistically update cache
    const patch = dispatch(
      api.util.updateQueryData('getPosts', undefined, (draft) => {
        const post = draft.find(p => p.id === id);
        if (post) Object.assign(post, changes);
      })
    );
    try {
      await queryFulfilled;
    } catch {
      patch.undo(); // rollback on failure
    }
  },
}),
```

### RTK Query vs React Query
| Feature | RTK Query | React Query |
|---|---|---|
| State management | Redux integrated | Standalone |
| Cache | Tag-based invalidation | Query key invalidation |
| Code generation | OpenAPI codegen | Manual |
| Optimistic updates | dispatch + undo | onMutate + rollback |
| DevTools | Redux DevTools | React Query DevTools |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"RTK Query: createApi defines endpoints (query + mutation). Auto-generated hooks (useGetXQuery, useXMutation). Tag-based cache invalidation — providesTags/invalidatesTags. Polling, optimistic updates (dispatch + undo on failure). Integrated with Redux store."*

## 4. 🧠 MEMORY AID
**"RTK Query = createApi + builder.query/mutation. providesTags → invalidatesTags. Auto hooks. Optimistic: updateQueryData + undo on fail."**
