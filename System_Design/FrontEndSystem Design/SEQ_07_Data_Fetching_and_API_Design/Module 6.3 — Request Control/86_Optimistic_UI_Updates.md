# 86. Optimistic UI Updates

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Optimistic UI updates** assume a user action will succeed and immediately update the UI before the server confirms it — providing instant responsiveness. When you "like" a tweet, the heart fills instantly without waiting for the server; if the API call fails, the UI rolls back. This pattern eliminates the perceived latency of network round-trips for common, low-risk operations. Senior engineers must understand not just how to implement optimistic updates, but when they're appropriate (low-risk, reversible operations), how to design rollback strategies for failure cases, and how to handle conflict resolution when multiple users modify the same data concurrently. Done wrong, optimistic updates create data inconsistencies more confusing than a loading spinner.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Core Pattern — The Optimistic Update Lifecycle

```
1. User action (click Like)
        ↓
2. OPTIMISTIC: Update local state immediately (like count + 1)
        ↓
3. Fire API request in background
        ↓
4a. SUCCESS: Server confirms → keep optimistic state
        OR
4b. FAILURE: Server rejects → ROLLBACK to previous state + show error
```

### Implementation with React Query

**React Query useMutation with Optimistic Update:**
```typescript
// The canonical React Query pattern for optimistic updates

function useLikePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (postId: string) => postsApi.like(postId),
    
    // Step 1: Optimistically update the cache BEFORE the request
    onMutate: async (postId: string) => {
      // Cancel any in-flight refetches to prevent them overwriting optimistic data
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      
      // Snapshot the previous value for rollback
      const previousPost = queryClient.getQueryData<Post>(['post', postId]);
      
      // Optimistically update the cache
      queryClient.setQueryData<Post>(['post', postId], (old) => {
        if (!old) return old;
        return {
          ...old,
          likeCount: old.likeCount + 1,
          isLikedByUser: true,
        };
      });
      
      // Also update the post in any list queries
      queryClient.setQueriesData<InfiniteData<PostPage>>(
        { queryKey: ['posts', 'feed'] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map(page => ({
              ...page,
              items: page.items.map(p =>
                p.id === postId
                  ? { ...p, likeCount: p.likeCount + 1, isLikedByUser: true }
                  : p
              ),
            })),
          };
        }
      );
      
      // Return context for rollback in onError
      return { previousPost };
    },
    
    // Step 2: On error — rollback to previous state
    onError: (err, postId, context) => {
      if (context?.previousPost) {
        queryClient.setQueryData(['post', postId], context.previousPost);
      }
      // Rollback feed list too
      queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] });
      
      toast.error('Failed to like post. Please try again.');
    },
    
    // Step 3: On success or error — always sync with server
    onSettled: (data, error, postId) => {
      // Refetch to ensure UI is consistent with server
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}

// Component usage — instant response
function PostCard({ post }: { post: Post }) {
  const { mutate: likePost } = useLikePost();
  
  return (
    <div>
      <button
        onClick={() => likePost(post.id)}
        aria-pressed={post.isLikedByUser}
        aria-label={`${post.isLikedByUser ? 'Unlike' : 'Like'} post`}
      >
        ❤️ {post.likeCount}
      </button>
    </div>
  );
}
```

### Advanced Pattern: Optimistic Update with ID Generation

```typescript
// When adding a new item before server assigns an ID
function useAddTodo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (text: string) => todosApi.create({ text }),
    
    onMutate: async (text: string) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);
      
      // Create a temporary ID for the optimistic item
      const optimisticTodo: Todo = {
        id: `temp_${Date.now()}`, // Temporary ID
        text,
        completed: false,
        createdAt: new Date().toISOString(),
        isOptimistic: true, // Flag for UI to show pending state
      };
      
      queryClient.setQueryData<Todo[]>(['todos'], (old = []) => [
        optimisticTodo,
        ...old,
      ]);
      
      return { previousTodos, optimisticTodoId: optimisticTodo.id };
    },
    
    onSuccess: (newTodo, _, context) => {
      // Replace temporary todo with server-assigned version
      queryClient.setQueryData<Todo[]>(['todos'], (old = []) =>
        old.map(todo =>
          todo.id === context?.optimisticTodoId ? newTodo : todo
        )
      );
    },
    
    onError: (err, _, context) => {
      queryClient.setQueryData(['todos'], context?.previousTodos);
      toast.error('Failed to add todo');
    },
  });
}
```

### When to Use Optimistic Updates

**Good candidates:**
```typescript
// ✅ Like, react, bookmark — low-stakes, easily reversible
// ✅ Toggle settings (dark mode, notifications) — instant feedback critical
// ✅ Add to cart — user expects immediacy
// ✅ Mark as read — non-destructive change
// ✅ Text field auto-save — frustrating to wait for each character save
// ✅ Reorder items (drag-and-drop) — visual reorder must be immediate

// ❌ Payment/checkout — never optimistic. Accuracy over speed
// ❌ Destructive operations (delete) — show confirmation dialog instead
// ❌ Complex operations with side effects (send email) — rollback may be impossible  
// ❌ Low-success-rate operations if API is known flaky
```

### Conflict Resolution — Multi-User Environments

```typescript
// Problem: Two users modify same data simultaneously
// User A: Optimistically increases count to 5
// User B: Simultaneously increases count to 5 (both started from 4)
// Server: Correctly sets to 6 (processed both)
// User A's UI snaps from 5 to 6 on onSettled refetch — jarring but correct

// Strategy 1: Server-wins (simplest — just refetch on settle)
onSettled: () => queryClient.invalidateQueries({ queryKey: ['post'] })

// Strategy 2: CRDT-style delta operations (advanced)
// Instead of: setLikeCount(5)
// Send: incrementLikeCount(+1)  — server adds 1 regardless of current value
// Frontend applies: currentCount + 1 optimistically
// Server applies: ATOMIC increment — no conflict

// Strategy 3: Operational Transform (Google Docs approach)
// For text collaboration — each operation has a position + revision number
// Server transforms incoming operations against any concurrent operations
// See topic 154: Conflict Resolution in Collaborative UIs
```

### Optimistic Updates with Loading/Pending States

```typescript
// Show visual distinction between optimistic (pending) and confirmed items

interface TweetCardProps {
  tweet: Tweet & { isOptimistic?: boolean };
}

function TweetCard({ tweet }: TweetCardProps) {
  return (
    <article
      aria-label={tweet.isOptimistic ? 'Sending...' : undefined}
      style={{
        opacity: tweet.isOptimistic ? 0.7 : 1,  // Visual pending state
        pointerEvents: tweet.isOptimistic ? 'none' : 'auto', // Prevent double-click
      }}
    >
      {tweet.isOptimistic && (
        <span aria-live="polite" className="pending-indicator">
          Sending...
        </span>
      )}
      <p>{tweet.content}</p>
    </article>
  );
}
```

### Error Handling & Rollback UX

```typescript
// Rollback must be UX-friendly, not jarring

function useDeleteItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (itemId: string) => itemsApi.delete(itemId),
    
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: ['items'] });
      const previousItems = queryClient.getQueryData<Item[]>(['items']);
      
      // Animate removal (CSS transition before removing from DOM)
      // The actual removal from React Query cache happens after animation
      queryClient.setQueryData<Item[]>(['items'], (old = []) =>
        old.filter(item => item.id !== itemId)
      );
      
      return { previousItems };
    },
    
    onError: (err, itemId, context) => {
      // Add an undo toast instead of jarring re-appearance
      queryClient.setQueryData(['items'], context?.previousItems);
      
      toast.error('Delete failed — item has been restored', {
        action: {
          label: 'Retry',
          onClick: () => deleteItem(itemId),
        },
      });
    },
  });
}
```

### Anti-Patterns & Pitfalls

**1. Optimistic updates on high-failure-rate operations:**
```typescript
// ❌ If this endpoint fails 20% of the time, users see constant rollback
// The rollback is more confusing than a loading spinner
mutationFn: () => flakyPaymentApi.charge()  // Not a candidate for optimistic
```

**2. Forgetting to cancel in-flight queries:**
```typescript
// ❌ Without cancellation:
// - onMutate: set optimistic count to 5
// - Meanwhile, old refetch completes: sets count back to 4 (stale data)
// - Optimistic update overwritten by stale refetch!

// ✅ Always cancel related queries in onMutate:
await queryClient.cancelQueries({ queryKey: ['post', postId] });
```

**3. Not syncing on settlement:**
```typescript
// ❌ Without onSettled invalidation:
// Optimistic state diverges permanently if server's result differs
// (e.g., server applied rate limiting — user can only like once per hour)

// ✅ Always sync with reality on settle:
onSettled: () => queryClient.invalidateQueries({ queryKey: ['post', postId] })
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Twitter/X Like Button:**
- Heart fills instantly on click — pure optimistic update
- No loading spinner — server response doesn't affect UX in success case
- On failure (~1% rate): count decrements, toast "Something went wrong"
- Count may briefly jump then correct when server responds: users don't notice

**LinkedIn Reactions:**
- Reaction icon animates instantly (optimistic)
- Count shows immediately
- Server confirms within 200ms — UI never has time to rollback visibly
- If it did fail: subtle correction, not a jarring revert

**Notion Text Editing:**  
- Every keystroke is optimistically applied locally
- Background sync sends delta operations to server
- Conflict resolution via Operational Transform if two editors collide
- Users see their own changes instantly; collaboration merges transparently

**SAP Fiori (Your Experience):**
- Approval actions in workflow apps use optimistic "Approved" badge immediately
- Background OData PATCH confirms; on failure: badge removed, status reverted
- Reduced perceived "waiting in approval queue" time by half

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Optimistic UI updates immediately reflect a user action in the UI without waiting for server confirmation. For low-risk reversible operations like toggling a like, starring a document, or reordering items, the expected success rate is near 100%, so showing a loading spinner adds latency with almost no information value.
>
> My implementation using React Query's useMutation follows a three-phase approach: in onMutate, I snapshot the previous cache state for rollback and immediately update the cache with the expected result; on success, the server-confirmed data naturally aligns with what we showed (or onSettled invalidation corrects any minor differences); on error, I restore the snapshot and show a user-friendly error with a retry option.
>
> The critical detail most implementations miss: cancel any in-flight queries in onMutate. If a refetch completes after onMutate runs, it overwrites the optimistic state with stale data. Calling queryClient.cancelQueries prevents this race condition.
>
> I don't use optimistic updates for payment flows, irreversible deletions, or low-reliability APIs. The rollback UX — seeing a count jump back or an item reappear — is more disruptive than an honest loading state. The rule is: use optimistic updates when failure is rare and the rollback is imperceptible."

**Likely Follow-up Questions:**
- "How do you handle optimistic updates in a collaborative document?" → Operational Transform or CRDT; each user's changes are applied locally immediately, resolved with concurrent server changes using semantic merging
- "What if the UI needs the server-assigned ID immediately after creation?" → Keep a temporary ID, replace it in onSuccess; disable actions on the item until real ID arrives (isOptimistic flag)
- "How do you make rollback feel less jarring?" → Animate the change; use undo toast instead of instant reversal; subtle opacity/pulse on pending state

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (see deep-dive above)

Complete `useLikePost` and `useAddTodo` with optimistic updates, rollback, and conflict handling in the deep-dive section above.

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**OSR Pattern:**
- **O**nMutate → snapshot + update cache + cancel in-flight queries  
- **S**ettle → invalidate to sync with server truth  
- **R**ollback → restore snapshot on error + user-friendly toast

**When to use:** Low failure rate + reversible + user expects instant feedback  
**When NOT to use:** Payments, irreversible, flaky APIs

If you blank: *"onMutate: save previous state, update cache optimistically, cancel in-flight queries. onError: restore saved state. onSettled: refetch for eventual consistency."*

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **UX**: Zero perceived latency on common actions — the difference between an app feeling native vs web  
→ **Performance**: Fewer loading spinners → smoother interaction flow → higher engagement  
→ **Business**: LinkedIn and Twitter A/B tests: instant like response → higher engagement rates

**How it works:**
→ React Query's `useMutation.onMutate` fires synchronously before the API call, snapshot previous cache state, and updates the cache to the expected post-mutation state. If the mutation fails, `onError` restores the snapshot. `onSettled` always calls `invalidateQueries` to ensure eventual consistency with the server's ground truth, correcting any optimistic/server divergence.

**Company relevance:**
→ **Microsoft**: Teams reactions, SharePoint document actions — all optimistic  
→ **Adobe**: Asset renaming, folder moves in Creative Cloud — instant feedback with background sync  
→ **Salesforce**: CRM field edits with inline save — optimistic with conflict detection on concurrent edits  
→ **Cisco**: Device status toggles in network config UI — optimistic with polling-based confirmation
