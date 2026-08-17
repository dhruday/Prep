# 149. Optimistic Updates with Rollback ★★

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Optimistic updates** are a UX pattern where the UI immediately reflects the result of a user action — before server confirmation arrives — making the application feel instantaneous. If the server succeeds, nothing changes. If the server fails, the UI **rolls back** to its previous state and shows an error. The name "optimistic" refers to the assumption that most mutations succeed; you optimistically apply the change and reconcile only on failure. This pattern is essential in real-time collaborative applications (like the Bosch manufacturing dashboard at SAP) where showing 200ms of "loading..." for every user action would make the system feel sluggish compared to desktop alternatives. TanStack Query (React Query), RTK Query, and Apollo Client all provide first-class support for optimistic updates with automatic rollback on mutation failure.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### The Core Pattern

```
User Action → UI Update (immediate, in-memory) → Server Request (async)
                                                          ↓
                                              Success → Confirm/Sync with server state
                                              Failure → Rollback to previous snapshot
```

### Why Rollback is Hard

Without a proper rollback strategy:
1. **Multiple in-flight requests**: User clicks "Like" twice before response — first request fails, rollback reverts second click too
2. **Stale closure**: Rollback callback captures old state; meanwhile server already partially committed
3. **Race conditions**: Server succeeds for some mutations but fails for others — partial rollback
4. **Concurrent users**: Another user changed the data between optimistic apply and server response

### TanStack Query v5 — Gold Standard Pattern

```typescript
import { useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  version: number;  // Optimistic concurrency control
}

interface UpdateTodoVariables {
  id: string;
  completed: boolean;
}

function useToggleTodo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, completed }: UpdateTodoVariables): Promise<TodoItem> => {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (!response.ok) throw new Error(`Server rejected update: ${response.status}`);
      return response.json();
    },
    
    // STEP 1: Called before mutation fires — apply optimistic update
    onMutate: async ({ id, completed }: UpdateTodoVariables) => {
      // Cancel any outgoing refetches that would overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      await queryClient.cancelQueries({ queryKey: ['todos', id] });
      
      // Snapshot the PREVIOUS value — this is our rollback target
      const previousTodos = queryClient.getQueryData<TodoItem[]>(['todos']);
      const previousTodo = queryClient.getQueryData<TodoItem>(['todos', id]);
      
      // Optimistically update the cache
      queryClient.setQueryData<TodoItem[]>(['todos'], (old) =>
        old?.map((todo) =>
          todo.id === id ? { ...todo, completed } : todo
        ) ?? []
      );
      
      queryClient.setQueryData<TodoItem>(['todos', id], (old) =>
        old ? { ...old, completed } : old
      );
      
      // Return snapshot as context for rollback
      return { previousTodos, previousTodo };
    },
    
    // STEP 2: Called on ERROR — rollback to snapshot
    onError: (error, variables, context) => {
      console.error('Mutation failed, rolling back:', error);
      
      if (context?.previousTodos !== undefined) {
        queryClient.setQueryData<TodoItem[]>(['todos'], context.previousTodos);
      }
      if (context?.previousTodo !== undefined) {
        queryClient.setQueryData<TodoItem>(['todos', variables.id], context.previousTodo);
      }
      
      // Show user-visible error
      toast.error(`Failed to update todo: ${error.message}`);
    },
    
    // STEP 3: Called after either success OR error — reconcile with server
    onSettled: (data, error, variables) => {
      // Always refetch to get authoritative server state
      // This handles cases where server modified data beyond our optimistic update
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['todos', variables.id] });
    },
    
    // STEP 4: Called on SUCCESS — optionally update cache with server response
    onSuccess: (serverTodo, variables) => {
      // Server might return a different version/timestamp than what we optimistically set
      queryClient.setQueryData<TodoItem>(['todos', variables.id], serverTodo);
    },
  });
}
```

### Redux Toolkit — Optimistic Updates Pattern

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface TaskState {
  items: Record<string, Task>;
  pendingOptimistic: Record<string, Task>;  // Snapshots before optimistic updates
}

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: { items: {}, pendingOptimistic: {} } as TaskState,
  reducers: {
    // Apply optimistic update — store snapshot for rollback
    optimisticallyUpdate: (state, action: PayloadAction<{ id: string; changes: Partial<Task> }>) => {
      const { id, changes } = action.payload;
      
      // Store previous state for potential rollback
      if (state.items[id]) {
        state.pendingOptimistic[id] = { ...state.items[id] };
      }
      
      // Apply change immediately
      if (state.items[id]) {
        Object.assign(state.items[id], changes);
      }
    },
    
    // Confirm optimistic update — remove rollback snapshot
    confirmUpdate: (state, action: PayloadAction<{ id: string; serverTask: Task }>) => {
      const { id, serverTask } = action.payload;
      state.items[id] = serverTask;           // Use server's authoritative data
      delete state.pendingOptimistic[id];     // No longer need rollback snapshot
    },
    
    // Rollback — restore previous state
    rollbackUpdate: (state, action: PayloadAction<{ id: string }>) => {
      const { id } = action.payload;
      if (state.pendingOptimistic[id]) {
        state.items[id] = state.pendingOptimistic[id];
        delete state.pendingOptimistic[id];
      }
    },
  },
});

// Thunk with optimistic update lifecycle
const updateTaskAsync = createAsyncThunk(
  'tasks/updateTask',
  async (payload: { id: string; changes: Partial<Task> }, { dispatch, rejectWithValue }) => {
    // APPLY OPTIMISTIC IMMEDIATELY (before async call)
    dispatch(tasksSlice.actions.optimisticallyUpdate(payload));
    
    try {
      const serverTask = await taskApi.update(payload.id, payload.changes);
      dispatch(tasksSlice.actions.confirmUpdate({ id: payload.id, serverTask }));
      return serverTask;
    } catch (error) {
      // ROLLBACK on failure
      dispatch(tasksSlice.actions.rollbackUpdate({ id: payload.id }));
      return rejectWithValue(error instanceof Error ? error.message : 'Update failed');
    }
  }
);
```

### Handling Multiple In-Flight Requests

```typescript
// Problem: User rapidly toggles a checkbox — two mutations in-flight
// Solution: Track in-flight mutations and only rollback if no other mutations are pending

class OptimisticMutationManager<T> {
  private snapshot: T | null = null;
  private pendingCount = 0;
  
  startMutation(currentState: T): void {
    if (this.pendingCount === 0) {
      // Only snapshot on the FIRST mutation — prevents later mutations
      // from overwriting the original clean state as the rollback target
      this.snapshot = structuredClone(currentState);
    }
    this.pendingCount++;
  }
  
  confirmMutation(): void {
    this.pendingCount--;
    if (this.pendingCount === 0) {
      // All mutations confirmed — discard rollback snapshot
      this.snapshot = null;
    }
  }
  
  rollbackMutation(): T | null {
    this.pendingCount = 0;
    const rollbackTarget = this.snapshot;
    this.snapshot = null;  // Clear after rollback
    return rollbackTarget;
  }
}
```

### Bosch Real-World Pattern (WebSocket + Optimistic Update)

```typescript
// At Bosch, manufacturing dashboards had WebSocket updates from sensors
// Plus user-triggered commands (start/stop machine, adjust parameters)
// Both optimistic updates AND WebSocket updates modified the same state

class ManufacturingDashboard {
  private socket: WebSocket;
  private machineStates = new Map<string, MachineState>();
  private rollbackSnapshots = new Map<string, MachineState>();
  
  stopMachine(machineId: string): void {
    const current = this.machineStates.get(machineId)!;
    
    // Snapshot BEFORE optimistic update
    this.rollbackSnapshots.set(machineId, { ...current });
    
    // Optimistic update — show "STOPPING" immediately
    this.machineStates.set(machineId, { ...current, status: 'STOPPING', userInitiated: true });
    this.renderMachine(machineId);
    
    // Send command over WebSocket
    this.socket.send(JSON.stringify({ type: 'STOP_MACHINE', machineId }));
    
    // Set timeout — if no server ACK in 5s, rollback
    setTimeout(() => {
      if (this.rollbackSnapshots.has(machineId)) {
        console.warn('No ACK received, rolling back optimistic update');
        this.machineStates.set(machineId, this.rollbackSnapshots.get(machineId)!);
        this.rollbackSnapshots.delete(machineId);
        this.renderMachine(machineId);
      }
    }, 5000);
  }
  
  handleWebSocketMessage(event: MessageEvent): void {
    const { type, machineId, state } = JSON.parse(event.data);
    
    if (type === 'MACHINE_STATE_UPDATE') {
      // Server confirmed — clear rollback snapshot, apply server state
      this.rollbackSnapshots.delete(machineId);
      this.machineStates.set(machineId, state);
      this.renderMachine(machineId);
    }
  }
  
  private renderMachine(machineId: string): void { /* update DOM */ }
}
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Twitter/X — Like Button:**
When you like a tweet, the heart turns red instantly. The server processes the action asynchronously. If the request fails (network error), the heart reverts to empty with a subtle shake animation. This uses a client-side snapshot before the optimistic update.

**Gmail — Archive/Delete Email:**
Gmail immediately removes the email from your inbox view, shows an "Undo" option. The server request runs in the background. The "Undo" itself is just preventing the server call (or issuing a restore call) — the rollback target is maintained in memory.

**Figma — Shape Movement:**
Every drag in Figma instantly moves the shape on your screen. The server syncs asynchronously via WebSocket/WebTransport. If disconnected, your local changes are held optimistically and synced when reconnected (CRDTs enable reliable rollback-free merge).

**Linear (Project Management):**
Issue status changes reflect immediately. Linear uses a CRDT-based sync system where conflicts are resolved automatically rather than rolled back — a more sophisticated version of optimistic updates.

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Optimistic updates mean applying a mutation to the UI immediately, before server confirmation, with a rollback mechanism if the server rejects it. The pattern has three steps: snapshot the current state, apply the optimistic change, then either confirm on success or restore the snapshot on failure. The tricky parts are handling multiple in-flight mutations — your first mutation's snapshot mustn't be overwritten by the second — and coordinating optimistic state with real-time WebSocket updates that might modify the same data. I used this pattern extensively at Bosch where our manufacturing dashboard needed sub-100ms response to operator commands. We combined WebSocket-driven sensor updates with command acknowledgments — optimistic update on command send, reconcile when ACK arrives or timeout to rollback. In React, TanStack Query's `onMutate`/`onError`/`onSettled` lifecycle is the cleanest implementation: cancel outgoing queries, snapshot, apply, rollback on error, invalidate on settle."

**Follow-up Questions:**
1. *What happens if multiple mutations are in-flight and only one fails?* → This requires per-mutation snapshots or a mutation queue that can partially rollback; TanStack Query handles this via the context returned from each `onMutate`
2. *How do optimistic updates interact with real-time WebSocket data?* → Need to merge incoming server state with pending optimistic state — either defer WebSocket updates while mutation is in-flight or use CRDT for conflict-free merge
3. *What's the UX approach if rollback happens?* → Show an inline error toast/banner, restore with animation (subtle transition), provide retry button — avoid hard page refresh
4. *How is this different from just using `loading` state?* → Loading state blocks UI with a spinner; optimistic assumes success for better perceived performance; loading is for operations that frequently fail or are destructive

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE
────────────────────────────────────────────────────────────

```typescript
// React component using TanStack Query optimistic toggle
import { useMutation, useQueryClient } from '@tanstack/react-query';

function TodoItem({ todo }: { todo: TodoItem }) {
  const queryClient = useQueryClient();
  
  const toggleMutation = useMutation({
    mutationFn: (completed: boolean) =>
      fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      }).then(r => { if (!r.ok) throw new Error('Server error'); return r.json(); }),
    
    onMutate: async (completed) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const snapshot = queryClient.getQueryData<TodoItem[]>(['todos']);
      queryClient.setQueryData<TodoItem[]>(['todos'], old =>
        old?.map(t => t.id === todo.id ? { ...t, completed } : t)
      );
      return { snapshot };  // Context for rollback
    },
    
    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(['todos'], context.snapshot);
      }
    },
    
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });
  
  return (
    <li style={{ opacity: toggleMutation.isPending ? 0.7 : 1 }}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={e => toggleMutation.mutate(e.target.checked)}
        disabled={toggleMutation.isPending}
      />
      {todo.title}
      {toggleMutation.isError && <span style={{ color: 'red' }}> Failed — reverted</span>}
    </li>
  );
}
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"Snapshot → Apply → Confirm or Rollback"**

TanStack Query lifecycle:
1. **`onMutate`** = snapshot + optimistic apply (cancel queries, save, update cache)
2. **`onError`** = restore snapshot (rollback)
3. **`onSettled`** = reconcile with server (invalidate queries)

**Multiple in-flight rule:** Only snapshot ONCE on the first pending mutation — later mutations build on optimistic state but rollback to the original clean snapshot.

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ Average network latency is 50–200ms; showing "loading..." for every user action makes web feel slow vs desktop apps
→ Research shows users perceive applications waiting <100ms as "instantaneous"
→ Rollback failure (showing stale data permanently) is worse than loading states — rollback must always work

**How it works:**
→ Before mutation: cancel outgoing queries (prevent stale overwrite), snapshot current cache, apply optimistic change
→ On error: restore snapshot, show error feedback, optionally offer retry
→ On settle: always invalidate/refetch to get authoritative server state (handles server-side transformations we didn't model optimistically)

**Company relevance:**
→ **Microsoft**: Teams message send uses optimistic update — message appears instantly, gets a ✓ when delivered
→ **Adobe**: Creative Cloud asset save operations use optimistic UI to mask S3 upload latency
→ **Salesforce**: CRM record updates shown optimistically; rollback shown inline if schema validation fails on server
→ **Cisco**: WebEx reaction system (thump up/emoji) is optimistic — immediate feedback, server confirmation async
