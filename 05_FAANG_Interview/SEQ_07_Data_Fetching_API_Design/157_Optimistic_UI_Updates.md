# 157. Optimistic UI Updates
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Optimistic UI is a pattern where the frontend updates the UI immediately as if the mutation will succeed, without waiting for the server response, and then reverts if the server returns an error. The user experiences zero latency for common successful operations — clicking "Like," checking a task complete, moving a card in Kanban — while the network request completes in the background. The three-phase lifecycle is: snapshot the current cache state before mutation, apply the optimistic update immediately, and on failure roll back from the snapshot. The risk is user confusion when a rollback happens — the UI jumps back to its previous state. This must be communicated with a clear error message and, for high-failure-rate operations, optimistic UI should not be used at all. For reliable, low-latency APIs where operations succeed 99%+, optimistic updates are the correct default.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Three-Phase Lifecycle

```typescript
// Phase 1: onMutate — fires BEFORE the network request
//   → snapshot current cache state for rollback
//   → cancel any in-flight refetches (would overwrite optimistic state)
//   → apply optimistic update to cache

// Phase 2: mutation runs — network request fires asynchronously

// Phase 3a: onError — if mutation fails
//   → restore snapshot (rollback)
//   → show error feedback to user

// Phase 3b: onSettled — always fires after success OR error
//   → invalidate queries to trigger a fresh server sync
//   (in case the server state differs from our optimistic assumption)
```

### TanStack Query — Complete Optimistic Mutation

```typescript
// Example: todo list item toggle

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  updatedAt: string;
}

function useTodoToggle() {
  const queryClient = useQueryClient();
  const QUERY_KEY = ['todos'] as const;

  return useMutation({
    mutationFn: (todo: Todo) =>
      api.todos.update(todo.id, { completed: !todo.completed }),

    // Phase 1: Before network request
    onMutate: async (todo: Todo) => {
      // Step A: Cancel any pending refetches for this query key
      // (Prevents server data from overwriting the optimistic update mid-flight)
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });

      // Step B: Snapshot current cache state for rollback
      const snapshot = queryClient.getQueryData<Todo[]>(QUERY_KEY);

      // Step C: Apply optimistic update
      queryClient.setQueryData<Todo[]>(QUERY_KEY, (old) =>
        old?.map(t =>
          t.id === todo.id ? { ...t, completed: !t.completed } : t
        ) ?? []
      );

      // Return snapshot in context so onError can use it
      return { snapshot };
    },

    // Phase 3a: Rollback on error
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(QUERY_KEY, context.snapshot);
      }
      // Show user-facing error notification
      toast.error('Failed to update task. Your change has been reverted.');
    },

    // Phase 3b: Always sync with server after mutation settles
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

// Component using the optimistic mutation
function TodoItem({ todo }: { todo: Todo }) {
  const { mutate: toggleTodo, isPending } = useTodoToggle();

  return (
    <li>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => toggleTodo(todo)}
        disabled={isPending}  // Prevent double-toggling during in-flight mutation
        aria-label={`Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`}
      />
      <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
        {todo.title}
      </span>
    </li>
  );
}
```

### Optimistic Add (Create Operation)

```typescript
// Adding an item optimistically requires a temporary ID
// The optimistic item needs to be replaced by the server-assigned ID on success

function useAddTodo() {
  const queryClient = useQueryClient();
  const QUERY_KEY = ['todos'] as const;

  return useMutation({
    mutationFn: (title: string) => api.todos.create({ title }),

    onMutate: async (title: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const snapshot = queryClient.getQueryData<Todo[]>(QUERY_KEY);

      // Create a temporary optimistic todo with a client-side ID
      const optimisticTodo: Todo = {
        id: `temp-${Date.now()}`,  // Temporary ID — will be replaced by server response
        title,
        completed: false,
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Todo[]>(QUERY_KEY, (old) =>
        [...(old ?? []), optimisticTodo]
      );

      return { snapshot, optimisticTodo };
    },

    onSuccess: (serverTodo, _title, context) => {
      // Replace the optimistic item with the real server item (has real ID)
      queryClient.setQueryData<Todo[]>(QUERY_KEY, (old) =>
        old?.map(t =>
          t.id === context?.optimisticTodo.id ? serverTodo : t
        ) ?? []
      );
    },

    onError: (_error, _title, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(QUERY_KEY, context.snapshot);
      }
      toast.error('Failed to add task.');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
```

### Optimistic Delete

```typescript
function useDeleteTodo() {
  const queryClient = useQueryClient();
  const QUERY_KEY = ['todos'] as const;

  return useMutation({
    mutationFn: (todoId: string) => api.todos.delete(todoId),

    onMutate: async (todoId: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const snapshot = queryClient.getQueryData<Todo[]>(QUERY_KEY);

      // Remove the item optimistically
      queryClient.setQueryData<Todo[]>(QUERY_KEY, (old) =>
        old?.filter(t => t.id !== todoId) ?? []
      );

      return { snapshot };
    },

    onError: (_error, _todoId, context) => {
      // Restore the deleted item on failure
      queryClient.setQueryData(QUERY_KEY, context?.snapshot);
      toast.error('Failed to delete task. The item has been restored.');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
```

### Optimistic "Undo" Pattern

```typescript
// For destructive operations: show a timed undo toast before committing
// Don't send the API call immediately — delay it by the undo window duration
// If user clicks "Undo", cancel the pending call

function useDeleteWithUndo() {
  const queryClient = useQueryClient();
  const { mutate: deleteTodo } = useDeleteTodo();
  const UNDO_WINDOW_MS = 5000;

  return (todoId: string, todoTitle: string) => {
    // Immediately remove from UI
    queryClient.setQueryData<Todo[]>(['todos'], (old) =>
      old?.filter(t => t.id !== todoId) ?? []
    );

    let cancelled = false;
    const toastId = toast(
      <div>
        <span>"{todoTitle}" deleted</span>
        <button
          onClick={() => {
            cancelled = true;
            toast.dismiss(toastId);
            // Restore the item (would need snapshot — simplified here)
            queryClient.invalidateQueries({ queryKey: ['todos'] });
          }}
        >
          Undo
        </button>
      </div>,
      { duration: UNDO_WINDOW_MS }
    );

    // Commit the delete after the undo window
    setTimeout(() => {
      if (!cancelled) {
        deleteTodo(todoId);
      }
    }, UNDO_WINDOW_MS);
  };
}
```

### Apollo Client — Optimistic Responses

```typescript
// Apollo has native support for optimistic responses
// The mutation cache update is the same mechanism, just declarative

const [toggleTodo] = useMutation(TOGGLE_TODO, {
  optimisticResponse: ({ id, currentCompleted }) => ({
    __typename: 'Mutation',
    toggleTodo: {
      __typename: 'Todo',
      id,
      completed: !currentCompleted,  // Optimistic value
    },
  }),
  // Apollo automatically merges the optimistic response into the cache
  // and reverts it if the real response differs or if an error occurs
  update: (cache, { data }) => {
    cache.modify({
      id: cache.identify({ __typename: 'Todo', id: data.toggleTodo.id }),
      fields: {
        completed: () => data.toggleTodo.completed,
      },
    });
  },
});
```

### When NOT to Use Optimistic UI

```typescript
// ❌ DON'T use optimistic UI for:

// 1. Operations with data returned from server that affects UI
//    (e.g., server assigns a price after complex calculation — can't predict optimistically)
const createOrder = async (items: CartItem[]) => {
  const order = await api.orders.create(items);
  // order.finalPrice calculated by server with discounts, taxes, etc.
  // Can't optimistically know the price — must wait
};

// 2. Irreversible operations with high stakes
//    (e.g., payment processing, legal document submission, sending emails)
const sendEmail = async (draft: EmailDraft) => {
  // If optimistic UI shows "sent" and then reverts → severe user confusion
  // User may not notice the revert and think email was sent when it wasn't
};

// 3. APIs with high failure rates (>5%)
//    If 1 in 20 operations reverts, users notice. Optimistic UI is jarring on reverts.
//    At 99%+ success rate, occasional reverts are acceptable exceptions.

// 4. Concurrent mutations by multiple users on shared data
//    (e.g., collaborative editing without CRDT/OT)
//    User A optimistically updates row 5; User B simultaneously updates row 5 on server
//    → conflicting states require explicit conflict resolution UI

// ✅ IDEAL for:
// • Like / upvote / bookmark (binary toggle, high success rate)
// • Task completion (checkbox in todo/project management)
// • Form field updates with auto-save (user writes → saved indicator updates)
// • Drag-and-drop reordering (position update)
// • Mark as read / unread
```

### ⚠️ Anti-Patterns

- **Skipping `cancelQueries`** — if a background refetch is in-flight when `onMutate` runs, the refetch will complete AFTER the optimistic update and overwrite it with stale server data; `cancelQueries` prevents this

- **Not implementing rollback** — optimistic UI without rollback is incorrect; when an error occurs, the UI shows the "updated" state permanently until the next page refresh, giving false information; `onError` with snapshot restore is mandatory

- **Using optimistic UI for irreversible side effects** — payment, send email, dispatch order; a rollback shows the user their action failed, but if the side effect already happened (email sent, payment captured), the UI misleads them about the true state

- **Optimistic ID clashes** — temporary `temp-123` IDs in lists; if the component re-renders before `onSuccess` replaces with the real ID, TanStack Query deduplication may create two entries; always replace temp IDs in `onSuccess` before `onSettled` triggers an invalidation

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the supplier evaluation form allowed procurement officers to mark review items as "reviewed" with a checkbox. Original implementation: 500ms wait per checkbox click (API round trip to update status on SAP backend). Migrated to optimistic toggle: click is instant, SAP backend update happens in background. Perceived responsiveness improved from "sluggish enterprise app" to "feels like a native desktop app." API failures happen ~0.3% of the time (SAP system overload) — rollback shows a toast "Update failed. Reverted to previous state."

**At FAANG scale:**
- **Microsoft:** Microsoft Teams — message reactions (likes, emojis) are 100% optimistic; the reaction appears immediately on your screen, propagates to other clients via WebSocket, and backend confirms asynchronously; failure rate is <0.01%; rollback is invisible to other clients (WebSocket correction)
- **Adobe:** Behance — "Appreciate" (like) button; optimistic +1 displayed immediately; count reconciled from server on next query refresh; similar pattern to Twitter/X likes
- **Salesforce:** Chatter feed post reactions — optimistic + count pessimistic (show "..." during count update); reactions are optimistic but post counts are exact from server to prevent confusion with +1/-1 discrepancies
- **Cisco:** Network configuration — NEVER optimistic; config push can fail silently on device; reverting shown config to user while device actually has the old config creates dangerous network state mismatches; Cisco UIs always wait for device ack before showing success

---

## 💬 4. Interview Execution

### Sample Answer

> "Optimistic UI has three phases. In `onMutate`, before the network request fires, I do three things: cancel any in-flight refetches with `cancelQueries` (to prevent them from overwriting the optimistic state when they complete), snapshot the current cache, and apply the predicted state immediately. The user sees the change before the network even starts.
>
> In `onError`, I restore from the snapshot — the UI jumps back to the previous state and I show a toast error. This rollback is why the pattern is only appropriate for high-reliability APIs where failures are rare; a frequent rollback is jarring.
>
> In `onSettled` (runs after either success or error), I `invalidateQueries` to sync the cache with the actual server state — in case the server response differs from my prediction (e.g., a different timestamp or server-assigned value).
>
> The key thing I'm asked about in interviews is when NOT to use this pattern: irreversible operations (payment processing, sending emails), high-failure-rate operations (>5%), and operations where the server response contains data you can't predict (calculated prices, generated IDs that affect UI structure)."

### Likely Follow-up Questions
1. "Why do you cancel in-flight queries in `onMutate`?" → If a background refetch is in-flight when optimistic update runs, the refetch will complete after the optimistic state is set and overwrite the cache with stale server data (the pre-mutation state); `cancelQueries` aborts that refetch so the optimistic state persists until `onSettled` triggers a fresh invalidation
2. "What happens if the server response differs from the optimistic state?" → `onSettled` always invalidates the query, triggering a fresh server fetch; the real server state replaces the optimistic state; if they differ (e.g., server-assigned timestamp or calculated value), the UI briefly shows the optimistic value then snaps to the real value; this snap is usually invisible if the difference is non-visual (timestamp) or very fast (50–100ms)
3. "How do you handle optimistic updates for a list item where the server assigns new data?" → In `onMutate`, give the optimistic item a temp ID (e.g., `temp-${Date.now()}`); in `onSuccess`, find the item by temp ID and replace it with the server response item; in `onSettled`, invalidate to get the canonical list; this ensures the temp ID doesn't persist in the rendered list
4. "Why use rollback instead of just invalidating the query?" → Invalidating fires a new network request which takes 200–400ms; during that time the UI shows the (incorrect) optimistic state; the rollback is instant — one synchronous cache write returning to the snapshot; the user sees an immediate correction, then `onSettled` invalidation brings the authoritative server state

---

## 💻 5. Code Example (TypeScript)

```typescript
// Generic optimistic mutation hook for any list-based update

function useOptimisticListMutation<
  TItem extends { id: string },
  TInput
>({
  queryKey,
  mutationFn,
  getOptimisticUpdate,
  onSuccessUpdate,
}: {
  queryKey: unknown[];
  mutationFn: (input: TInput) => Promise<TItem>;
  getOptimisticUpdate: (items: TItem[], input: TInput) => TItem[];
  onSuccessUpdate?: (items: TItem[], result: TItem, input: TInput) => TItem[];
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (input: TInput) => {
      await queryClient.cancelQueries({ queryKey });
      const snapshot = queryClient.getQueryData<TItem[]>(queryKey);
      queryClient.setQueryData<TItem[]>(queryKey, (old) =>
        getOptimisticUpdate(old ?? [], input)
      );
      return { snapshot };
    },
    onError: (_err, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(queryKey, context.snapshot);
      }
    },
    onSuccess: (result, input) => {
      if (onSuccessUpdate) {
        queryClient.setQueryData<TItem[]>(queryKey, (old) =>
          onSuccessUpdate(old ?? [], result, input)
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Usage: optimistic task toggle
const { mutate: toggleTask } = useOptimisticListMutation<Task, string>({
  queryKey: ['tasks', projectId],
  mutationFn: (taskId) => api.tasks.toggle(taskId),
  getOptimisticUpdate: (tasks, taskId) =>
    tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t),
  onSuccessUpdate: (tasks, serverTask) =>
    tasks.map(t => t.id === serverTask.id ? serverTask : t),
});
```

---

## 🧠 6. Memory Aid

**OSR lifecycle:**
- **O**nMutate: cancel queries → snapshot → optimistic update
- **S**ettled (onSettled): always invalidate (sync server truth)
- **R**ollback (onError): restore snapshot + show toast

**The GPS Analogy:**
Optimistic UI is like a GPS app predicting your position between GPS pings — it shows you moving forward immediately based on speed/direction rather than waiting for the next satellite fix; if the satellite fix comes back and you're actually in a different position (took a wrong turn), it snaps to the real position; 99% of the time the prediction is correct and the experience is seamless

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ A 200–400ms network round trip on a common action (like a checkbox toggle) accumulates into noticeable sluggishness — in a project management tool where a user checks off 50 tasks in a session, non-optimistic UI means 50 × 300ms = 15 seconds of waiting spread across the session; optimistic UI reduces that to 0ms perceived latency
→ The `cancelQueries` step is non-obvious but critical — without it, TanStack Query's automatic background refetch (which fires when the window regains focus or on a stale timer) will overwrite the optimistic state within milliseconds on a fast connection, making the optimistic update invisible and the UI appear to briefly flash
→ Choosing when NOT to use optimistic UI requires understanding the failure rate and consequence of rollback: a 1% failure rate means 1 in 100 user actions will visibly snap back — for a "like" button this is fine; for a bank transfer form showing "Transfer complete" before actually confirming, it's a critical UX failure

**How it works (2 sentences):**
TanStack Query's `onMutate` callback receives the mutation input synchronously before the network request fires — `queryClient.setQueryData()` writes directly to the in-memory cache, triggering all subscribed `useQuery` hooks to re-render with the new data immediately, without any network latency; the return value of `onMutate` (the context object containing the snapshot) is passed to both `onError` and `onSettled`, enabling rollback.
On mutation failure, `queryClient.setQueryData()` in `onError` writes the snapshot back to cache, triggering another synchronous re-render that restores the pre-mutation state; `onSettled` then calls `queryClient.invalidateQueries()` which marks the cache entry as stale and fires a fresh server fetch to ensure the cache reflects the authoritative server state regardless of whether the mutation succeeded or failed.

---
✅ Topic 157/486 complete → Continuing to Topic 158: Error Handling & Retry Strategies
