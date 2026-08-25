# Microsoft — L63 Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Software Engineer (Frontend) |
| **Level** | L63 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Microsoft Loop |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (2 Technical + Design + As Appropriate)

---

## Round 1: Coding + Concepts
**Duration:** 60 minutes

### Questions Asked
1. **Implement `Object.assign()` deep clone polyfill** (handle nested objects, arrays, symbols)
2. **Implement custom `useReducer` hook from scratch**
3. **Follow-up: Add middleware support (like Redux middleware)**

### 💡 Deep Object.assign + Custom useReducer

```javascript
/**
 * Deep Object.assign — recursively merges source objects into target.
 * - Plain objects: deep merge
 * - Arrays: replaced (not merged element-by-element, per convention)
 * - Symbols: copied
 * - Getters/Setters: property descriptor preserved
 * - Circular references: handled via WeakSet
 */
function deepAssign(target, ...sources) {
  const seen = new WeakSet();
  
  function merge(target, source) {
    if (seen.has(source)) return target; // Circular reference guard
    if (typeof source === 'object' && source !== null) seen.add(source);
    
    // Get all keys including Symbols
    const keys = [
      ...Object.getOwnPropertyNames(source),
      ...Object.getOwnPropertySymbols(source)
    ];
    
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(source, key);
      
      if (!descriptor.enumerable) continue; // Skip non-enumerable
      
      // If it's a getter/setter, copy the descriptor
      if (descriptor.get || descriptor.set) {
        Object.defineProperty(target, key, descriptor);
        continue;
      }
      
      const sourceVal = source[key];
      const targetVal = target[key];
      
      // Deep merge if both are plain objects
      if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
        target[key] = merge(targetVal, sourceVal);
      } else if (Array.isArray(sourceVal)) {
        // Arrays: clone (don't deep merge with target array)
        target[key] = cloneArray(sourceVal);
      } else {
        target[key] = sourceVal;
      }
    }
    
    return target;
  }
  
  function isPlainObject(val) {
    if (typeof val !== 'object' || val === null) return false;
    const proto = Object.getPrototypeOf(val);
    return proto === Object.prototype || proto === null;
  }
  
  function cloneArray(arr) {
    return arr.map(item => {
      if (isPlainObject(item)) return merge({}, item);
      if (Array.isArray(item)) return cloneArray(item);
      return item;
    });
  }
  
  for (const source of sources) {
    if (source != null) merge(target, source);
  }
  
  return target;
}

/**
 * Custom useReducer hook with middleware support.
 * Middleware: (dispatch) => (action) => { ... dispatch(action) ... }
 */
function useReducerWithMiddleware(reducer, initialState, middlewares = []) {
  const [state, setState] = React.useState(initialState);
  const stateRef = React.useRef(state);
  stateRef.current = state;
  
  const dispatch = React.useCallback((action) => {
    const newState = reducer(stateRef.current, action);
    stateRef.current = newState;
    setState(newState);
  }, [reducer]);
  
  // Apply middlewares (compose right-to-left)
  const enhancedDispatch = React.useMemo(() => {
    if (middlewares.length === 0) return dispatch;
    
    // Middleware API: each middleware gets { getState, dispatch }
    const api = {
      getState: () => stateRef.current,
      dispatch: (...args) => enhancedDispatch(...args) // Forward reference
    };
    
    const chain = middlewares.map(middleware => middleware(api));
    
    // Compose: chain[0](chain[1](chain[2](dispatch)))
    return chain.reduceRight((next, mw) => mw(next), dispatch);
  }, [dispatch, middlewares]);
  
  return [state, enhancedDispatch];
}

// Logger middleware
const loggerMiddleware = (api) => (next) => (action) => {
  console.log('Dispatching:', action);
  const result = next(action);
  console.log('New state:', api.getState());
  return result;
};

// Thunk middleware (async actions)
const thunkMiddleware = (api) => (next) => (action) => {
  if (typeof action === 'function') {
    return action(api.dispatch, api.getState);
  }
  return next(action);
};

// Usage:
function App() {
  const [state, dispatch] = useReducerWithMiddleware(
    todoReducer,
    { todos: [], filter: 'all' },
    [loggerMiddleware, thunkMiddleware]
  );
  
  // Async action with thunk middleware
  const fetchTodos = () => dispatch(async (dispatch, getState) => {
    dispatch({ type: 'FETCH_START' });
    const res = await fetch('/api/todos');
    const data = await res.json();
    dispatch({ type: 'FETCH_SUCCESS', payload: data });
  });
}
```

---

## Round 2: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Microsoft Loop's Real-Time Collaborative Component System**
   - Embeddable components (tables, task lists, vote) shared across Teams/Outlook/Word
   - Live collaboration on any embedded component
   - Component lifecycle: create → embed → collaborate → detach
   - Offline support with conflict resolution
   - Component-level permissions (view/edit/admin)

### 💡 Loop Component Architecture

```
Microsoft Loop Component System:

Component Definition:
┌──────────────────────────────────────────────────┐
│ LoopComponent = {                                 │
│   id: "comp-uuid",                               │
│   type: "table" | "task_list" | "vote" | ...,   │
│   version: 42,                                   │
│   data: { /* type-specific CRDT state */ },      │
│   permissions: {                                  │
│     owner: "user-123",                           │
│     editors: ["user-456", "group-team-x"],       │
│     viewers: ["user-789"]                        │
│   },                                             │
│   embeddings: [                                   │
│     { host: "teams", threadId: "t-1" },          │
│     { host: "outlook", emailId: "e-2" },         │
│     { host: "word", docId: "d-3" }               │
│   ]                                              │
│ }                                                │
│                                                  │
│ Key: component is HOST-AGNOSTIC.                 │
│ Same component instance across Teams/Outlook/Word │
│ Changes in one → visible in all others instantly  │
└──────────────────────────────────────────────────┘

Rendering Architecture:
┌─────────────────────────────────────────────────┐
│ Host Applications (Teams, Outlook, Word):        │
│                                                  │
│ <LoopComponentFrame componentId="comp-uuid">     │
│   ├── Permission check (can user view/edit?)     │
│   ├── <LoopComponentRenderer type={comp.type}>   │
│   │   │ Dynamically loads component module:      │
│   │   │                                          │
│   │   │ componentRegistry = {                    │
│   │   │   table: () => import('./TableComponent'),│
│   │   │   task_list: () => import('./TaskList'), │
│   │   │   vote: () => import('./Vote'),          │
│   │   │ }                                        │
│   │   │                                          │
│   │   │ Each module exports:                     │
│   │   │ {                                        │
│   │   │   render(container, state, dispatch),     │
│   │   │   schema: YjsDocSchema, // CRDT schema  │
│   │   │   toolbar: ToolbarConfig                 │
│   │   │ }                                        │
│   │   │                                          │
│   │   ├── <ComponentToolbar /> (edit mode)       │
│   │   └── <ComponentBody /> (rendered content)   │
│   │                                              │
│   ├── <CollaborationBar>                         │
│   │   ├── Avatar stack (active editors)          │
│   │   └── Cursor positions (colored)             │
│   └── <PermissionBadge /> (view-only / editor)   │
│ </LoopComponentFrame>                            │
│                                                  │
│ Isolation: component runs in iframe sandbox OR    │
│ Shadow DOM to prevent CSS/JS leaking to host     │
└─────────────────────────────────────────────────┘

Real-Time Sync (Yjs CRDT):
┌─────────────────────────────────────────────────┐
│ Why Yjs (not OT)?                                │
│ • No central server required for conflict        │
│   resolution (P2P possible)                      │
│ • Works offline (merge on reconnect)             │
│ • Sub-document support (each component = Y.Doc) │
│                                                  │
│ Sync Protocol:                                   │
│ 1. User opens component                         │
│ 2. Client loads Yjs document from server         │
│ 3. WebSocket connection (Fluid Framework relay)  │
│ 4. Local edits → Yjs mutation → binary update    │
│ 5. Update broadcast to all connected clients     │
│ 6. Merge: Yjs CRDT automatically resolves        │
│                                                  │
│ Awareness Protocol:                              │
│ • Cursor position, selection, user name/color    │
│ • Broadcasts to all participants every 500ms     │
│                                                  │
│ Table Component Yjs Schema:                      │
│ const doc = new Y.Doc()                          │
│ const rows = doc.getArray('rows')                │
│ // Each row: Y.Map { col1: Y.Text, col2: Y.Text }│
│ // Y.Text supports character-level CRDT          │
│ // Y.Array supports concurrent insert/delete      │
└─────────────────────────────────────────────────┘

Offline Support:
┌─────────────────────────────────────────────────┐
│ 1. IndexedDB: persist Yjs document state locally │
│    (y-indexeddb provider)                        │
│ 2. User edits offline → mutations applied to     │
│    local Yjs doc                                 │
│ 3. On reconnect: sync protocol exchanges only    │
│    missing updates (efficient delta sync)        │
│ 4. CRDT guarantees: no conflicts to resolve      │
│    manually — Yjs handles automatically          │
│ 5. Edge case: two users offline for days → both  │
│    edit same cell → last-writer-wins per cell    │
│    (cell = Y.Text, character-level merge)        │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Microsoft FE = **Deep Object.assign + useReducer with middleware + Loop component design**
- **Deep merge**: check `isPlainObject` for both source and target — only deep merge plain objects, replace arrays
- **Symbol keys**: `Object.getOwnPropertySymbols()` — often missed in polyfill implementations
- **useReducer middleware**: compose pattern — `chain.reduceRight((next, mw) => mw(next), dispatch)`
- **Thunk middleware**: if action is function, call it with `(dispatch, getState)` — enables async actions
- **Loop components**: host-agnostic, CRDT-based (Yjs), embeddable in iframe/Shadow DOM for isolation
- **Yjs over OT**: no central server needed for conflict resolution, works offline, sub-documents
- Microsoft interviews: **React internals + collaboration systems** — know hooks implementation, CRDT concepts

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding + Concepts | Hard | Deep Clone, useReducer, Middleware |
| FE System Design | Very Hard | Loop Components, CRDT, Yjs |
| Technical 2 | Medium-Hard | Performance, React |
| As Appropriate | Medium | Collaboration, Leadership |
