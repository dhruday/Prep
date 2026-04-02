# 82. Reconciliation Algorithm — How React Diffs the Virtual DOM
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

React's reconciliation algorithm determines the minimum set of DOM operations needed to go from the previous render output to the new one. Instead of the O(n³) optimal tree diff algorithm (computationally prohibitive), React uses an O(n) heuristic based on two assumptions: elements of different types produce entirely different trees (just replace), and elements at the same position with the same type can be reused (just update). The `key` prop enables a third heuristic for lists: stable identity across positions. Understanding reconciliation explains why component positioning matters, why `key` changes cause full remounts, and why the rules of hooks (never conditional, never in loops) exist — they all relate to Fiber's tree diffing guarantees.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**The theoretical problem:**

Given two arbitrary trees, computing the minimum edit distance is O(n³) — for a tree with 1000 nodes, that's 10⁹ operations per render. Completely impractical.

**React's O(n) heuristic:**

React applies three rules that make diffing linear:

1. **Different type → full replace** (no traversal into children)
2. **Same type, same position → reuse and update** (traverse children)
3. **Lists → `key` for stable identity across positions**

### Heuristic 1 — Element Type Change = Full Replace

When React encounters a fiber at the same position in the tree with a different `type`:

```
Old tree: <div> → <Button> → <Icon>
New tree: <span> → ???

Rule: div ≠ span → unmount entire subtree (div + Button + Icon)
      Mount entirely new <span> tree
```

**Consequence:** If you conditionally render completely different component types at the same tree position, every switch destroys and recreates the DOM subtree and resets all state. This is intentional — different types have incompatible internal structure.

```tsx
// ❌ State is LOST when type switches
function Tabs({ activeTab }) {
  return activeTab === 'A'
    ? <FormEditor />    // type: FormEditor
    : <TableView />;    // type: TableView
  // Switching tabs unmounts FormEditor, mounts TableView
  // All FormEditor state (draft, scroll position) is gone
}

// ✅ Preserve state across tabs — keep both mounted
function Tabs({ activeTab }) {
  return (
    <>
      <FormEditor style={{ display: activeTab === 'A' ? 'block' : 'none' }} />
      <TableView style={{ display: activeTab === 'B' ? 'block' : 'none' }} />
    </>
  );
}
```

### Heuristic 2 — Same Type at Same Position = Reuse

When the type matches at the same tree position, React diffs the props and updates only what changed:

```tsx
// Old: <div className="a" id="root"> → <Button disabled={false}>
// New: <div className="b" id="root"> → <Button disabled={true}>

// React action:
// div: same type → update className from 'a' to 'b' (keep DOM node)
//   Button: same type → update disabled prop (keep DOM node + fiber + state)
```

**This is why component position in JSX matters more than most developers realize:**

```tsx
// WRONG — React sees type change at position 0 on isLoggedIn toggle
function Welcome({ isLoggedIn }) {
  return (
    <div>
      {isLoggedIn ? <UserGreeting /> : <GuestGreeting />}
    </div>
  );
}

// Each toggle UNMOUNTS the old component, MOUNTS the new one
// UserGreeting's state is DESTROYED on logout
// This is correct for greeting components; avoid for stateful components

// CORRECT — preserve state with key uniqueness
function Welcome({ isLoggedIn }) {
  return (
    <div>
      {isLoggedIn
        ? <UserGreeting key="user" />
        : <GuestGreeting key="guest" />}
      {/* Different keys at same position → React knows they are different instances */}
    </div>
  );
}
```

### Heuristic 3 — Lists and the `key` Prop

Without `key`, React diffs lists positionally. This causes incorrect behavior on reorder and unnecessary remounts on prepend:

```tsx
// Old: [<Item id="A"/>, <Item id="B"/>, <Item id="C"/>]
// New (prepend): [<Item id="D"/>, <Item id="A"/>, <Item id="B"/>, <Item id="C"/>]

// Without key:
// Position 0: A → D: same type (Item), update — A's state is GIVEN to D component instance
// Position 1: B → A: same type, update — misidentified
// Position 2: C → B: same type, update
// Position 3: (new) → C: mount new DOM node
// 3 unnecessary updates + 1 mount; data is SCRAMBLED

// With key={item.id}:
// key "D" is new → mount at position 0
// key "A" already exists → move DOM node from position 0 to 1, update if changed
// key "B" → move, key "C" → move
// 1 mount + 3 moves (DOM reuse via key identity)
```

**`key` resets state when changed:**

This is a deliberate reset mechanism:

```tsx
// Trick: force full component reset by changing key
function RecordEditor({ recordId }) {
  return <Editor key={recordId} />;
  // When recordId changes, React unmounts Editor, mounts fresh one
  // Editor's internal state (unsaved changes, scroll position) resets
  // This is preferable to complex "reset on prop change" useEffect logic
}
```

**`key` must be stable, unique, and not array index when list is dynamic:**

```tsx
// ❌ Index key — breaks on sort, filter, insert
items.map((item, i) => <Item key={i} item={item} />)

// ✅ Stable ID key
items.map(item => <Item key={item.id} item={item} />)

// When to use index: static, non-reorderable, append-only lists
tabs.map((tab, i) => <Tab key={i} tab={tab} />)
// Tabs don't reorder → index is stable → acceptable
```

### How Reconciliation Interacts With Fiber

Reconciliation in Fiber happens in the `beginWork` phase:

1. React receives a `renderLanes` bitmask — which priorities to process this pass
2. For each fiber, `beginWork` compares current fiber props vs pending props
3. If same type: walk children, produce diff flags (`Update`, `Placement`, `ChildDeletion`)
4. If different type: flag entire subtree for deletion, create new fiber branch
5. Collected flags form the "effects list" passed to the commit phase
6. Commit phase reads the effects list and makes the actual DOM mutations

**Why hooks rules are reconciliation rules:**

Hooks are stored on the fiber as a linked list — `hook1 → hook2 → hook3`. React identifies each hook by its **position** in this list, not by name. React reconciles hooks by iterating the list in order:

```
Render 1: useState(0) → useEffect(...) → useMemo(...)
          Hook[0]        Hook[1]            Hook[2]

Render 2 (same):
          useState(0) → useEffect(...) → useMemo(...)
          Hook[0]        Hook[1]            Hook[2]
          ✅ Same list length, same positions — correct

Render 2 with conditional hook:
          if (count > 0) { useState(inner) }  ← conditional
          useEffect(...)  ← shifts to Hook[0] or Hook[1] depending on condition
          React: Hook[1] now maps to what was Hook[0] previously → DATA CORRUPTION
          ❌ This is why hooks must not be conditional
```

### Performance Implications

- **Type-based short-circuiting:** Different types stop diffing immediately — O(1) for type mismatch, no child traversal
- **Bailout optimizations:** If a fiber's `pendingProps === memoizedProps` (exact same reference) and no context changed, React can bail out of the entire subtree — `React.memo`, `PureComponent`, and optimized selectors enable this
- **Fiber bailout vs shallow comparison:** `React.memo` does a shallow (Object.is) comparison of all props by default; bailout skips the render call and the subtree diff
- **Keys for stable DOM identity:** Key-based list diffing enables DOM node reuse across positions, avoiding destroy/create cycles

### ⚠️ Anti-Patterns & Pitfalls

- **Components defined inside render functions (inline component definitions)** — Every render creates a new function reference for the inner component, making it a "different type" on each render — full remount every render.
- **Using array index as key for dynamic lists** — Position-based key makes React unable to track identity across reorders; drag-sort, filter, and insert all cause state corruption and unnecessary DOM mutations.
- **Unstable keys from `Math.random()`** — Random keys are different every render — every list item unmounts and remounts every render. Catastrophic for performance and state.
- **Changing component type at the same tree position to "reset" state** — While it technically works, it's fragile. The explicit pattern is `key` change on the component you want to reset.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At Oracle, the record list had a `<RecordRow>` component that conditionally rendered either a `<ReadonlyRow>` or `<EditableRow>` at the same tree position. Switching from view to edit mode caused full remounts (including a re-fetch in `useEffect`) because the types were different. The fix: use a single `<UnifiedRow isEditing={isEditing}>` component at that position — same type, React updated props only, no remount. The edit transition became instant.

At SAP, a tab interface was losing form state when switching between tabs because component types were different at position 0. The fix used the `key` trick with a stable tab ID — tabs now kept their state while switching, and users could work across multiple tabs without losing partial form data.

**At FAANG scale:**
- **Microsoft (Visual Studio Code Web):** File explorer tree diff — when a file is renamed, React reconciliation via stable `key={fileId}` moves the DOM node without remounting, preserving scroll position and selection state in the file tree panel
- **Adobe (XD/Firefly):** Layer list in design tools — layers have stable `layerId` keys; reordering layers (drag-to-reorder) moves DOM nodes via key tracking, preserving per-layer UI state (expanded/collapsed, scroll position)
- **Salesforce (Tableau):** Dashboard tile layout — tile components keyed by `tileId`; when layout is reconfigured (tiles move position), React moves and updates (not destroys) the tile DOM nodes
- **Cisco (DevNet Portal):** API documentation code samples — keyed by language+version; language switcher uses key to force fresh mount (clear copied state), intentional reset via key change

**How it evolves with scale:**
- Small scale: List reconciliation errors feel like minor bugs
- Medium scale: Missing keys or unstable keys cause measurable frame drops on list operations
- Large scale: Correct reconciliation is critical for performance — Adobe Photoshop Web's layer list could have thousands of layers; O(n) diffing with correct keys vs O(n²) without = difference between 60fps and 5fps

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "React's reconciliation algorithm is an O(n) heuristic that avoids the O(n³) theoretical diff cost. It's based on two core rules plus the key mechanism.
>
> Rule one: if the element type at a position changes — say from `div` to `span`, or from `UserCard` to `AdminCard` — React unmounts the entire subtree and mounts fresh. No attempt to reconcile children. This is why putting a different component type at the same tree position on a condition toggle causes full unmount-remount, losing all state.
>
> Rule two: if the type is the same, React keeps the fiber and updates only the changed props. This is why component position in your JSX structure matters as much as component type.
>
> Keys extend this to dynamic lists — without keys, React diffs lists positionally, causing state scrambling on reorder and prepend. With stable keys, React tracks items by identity: it knows which DOM node belongs to which item regardless of its current position.
>
> The hooks rules all flow from reconciliation — hooks are identified by their position in a per-fiber linked list, so adding or removing hooks conditionally shifts positions and corrupts the state mapping."

### Likely Follow-up Questions

1. **Can React reconcile across different parent nodes?** → No — React's reconciliation is strictly same-position-in-same-parent. If a component moves to a different parent, it unmounts from the old parent and mounts in the new one — full remount, state reset.
2. **What happens to `useEffect` cleanup on full remount?** → When a component unmounts (due to type change at position, key change, or parent unmount), React runs all effect cleanup functions in order before unmounting. The cleanup of `useEffect(() => { return cleanup; })` fires before the DOM node is removed.
3. **Why does changing `key` cause a full remount instead of a reuse?** → `key` is React's explicit identity signal. A key change tells React "this is a different entity at this position" — equivalent to a type change from React's perspective. React unmounts the old fiber, mounts a new one. All state is reset. This is the intended reset mechanism.
4. **How does React.memo interact with reconciliation?** → `React.memo` wraps a component and adds a props bailout check before `beginWork`. If all props pass `Object.is` equality (o same reference for objects), React skips the function call and subtree diff entirely — the fiber is reused as-is. This is "bailout" in React's reconciliation.

### vs Alternatives

| React reconciliation (Fiber) | Vue VDOM diffing | Angular Ivy CD |
|---|---|---|
| O(n) heuristic, key-based | Similar O(n) heuristic | O(dirty components) with OnPush |
| Component tree | Component tree | Component tree |
| Key for list identity | :key for list identity | trackBy for list identity |
| Different type = full replace | Different tag = full replace | N/A — no VDOM |

### How to Signal Senior Thinking

> "Reconciliation is not just a performance optimization — it's a correctness guarantee. Your component's state lifetime is defined by reconciliation: state exists for as long as the fiber exists in the current tree at its stable position with its stable type and key. Any of those three change: type, position, or key — and the state is destroyed. Understanding this tells you when and why to preserve component identity, when to intentionally reset it via key change, and why inline component definitions inside JSX are a correctness anti-pattern, not just a performance one."

---

## 💻 5. Code Example

```typescript
import React, { useState, useEffect } from 'react';

// ========================
// Heuristic 1: Type change = full remount
// ========================
function DocumentEditor({ mode }: { mode: 'view' | 'edit' }) {
  return (
    <div>
      {/* ❌ Different types at same position — state LOST on mode switch */}
      {mode === 'edit' ? <RichTextEditor /> : <ReadonlyPreview />}
    </div>
  );
}

function DocumentEditorFixed({ mode }: { mode: 'view' | 'edit' }) {
  return (
    <div>
      {/* ✅ Same type at same position — state PRESERVED on mode switch */}
      <UnifiedEditor readOnly={mode === 'view'} />
    </div>
  );
}

// ========================
// Heuristic 2: Key-based identity for controlled reset
// ========================
function RecordDetailPanel({ recordId }: { recordId: string }) {
  return (
    // key change on recordId → React unmounts old Editor, mounts fresh one
    // All unsaved state in the editor resets when navigating to a new record
    // Cleaner than: useEffect(() => { resetState(); }, [recordId])
    <EditableFormPanel key={recordId} recordId={recordId} />
  );
}

// ========================
// Heuristic 3: List keys
// ========================
interface Task {
  id: string;
  text: string;
  done: boolean;
}

function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul>
      {/* ❌ Index key — breaks on sort/filter */}
      {/* {tasks.map((task, i) => <TaskItem key={i} task={task} />)} */}

      {/* ✅ Stable ID key — survives sort, filter, insert */}
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}

function TaskItem({ task }: { task: Task }) {
  // Local state persists during re-renders when key is stable
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <li>
      <span>{task.text}</span>
      <button onClick={() => setIsExpanded(!isExpanded)}>Details</button>
      {isExpanded && <TaskDetails taskId={task.id} />}
    </li>
  );
}

// ========================
// Inline component definition — reconciliation trap
// ========================
function ParentComponent() {
  const [count, setCount] = useState(0);

  // ❌ WRONG: InlineChild is re-defined on every render
  // New function reference = new "type" from React's perspective = FULL REMOUNT every render
  const InlineChild = () => <input placeholder="type here..." />;
  // Input state (typed text) is LOST on every parent re-render

  // ✅ CORRECT: Define components outside the render function
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <InlineChild />  {/* unmounts + remounts every click */}
      <StableChild />  {/* kept stable — no remount */}
    </div>
  );
}

// Component defined outside — stable reference, React preserves fiber
const StableChild = () => <input placeholder="type here..." />;

// ========================
// Hooks linked list — reconciliation enforces order
// ========================
function Counter({ isAdmin }: { isAdmin: boolean }) {
  const [count, setCount] = useState(0);  // Hook[0] — always

  // ❌ WRONG — conditional hook changes list length
  // if (isAdmin) {
  //   const [adminCount, setAdminCount] = useState(0);  // Hook[1] only sometimes
  // }

  // ✅ CORRECT — hook always called, condition inside
  const [adminCount, setAdminCount] = useState(0);  // Hook[1] — always
  const displayAdminCount = isAdmin ? adminCount : 0;

  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);  // Hook[2] (useEffect) — always at same position

  return <div>{count} {isAdmin && displayAdminCount}</div>;
}
```

---

## 🧠 6. Memory Aid

**Mental Model:** React's reconciler is like a DNA comparison — if the base sequence (element type) matches at a position, update what differs; if it doesn't match, scrap the old chain and write a new one. The `key` prop is a name tag that overrides positional matching for lists.

**If you go blank:** "Two rules: different type = full unmount+mount; same type = update props. Keys give list items stable identity across positions. Hooks are position-indexed in a per-fiber linked list — that's why conditional hooks break reconciliation."

**Mnemonic:** **TKH** — **T**ype governs reuse, **K**ey governs list identity, **H**ooks are position-indexed (never conditional).

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Correctness: Component state lifetime is defined by reconciliation — type, position, and key determine when state is destroyed; understanding this prevents state-loss bugs and unexpected remounts
→ Performance: O(n) heuristic + type-based early exit + `React.memo` bailout + key-based DOM reuse are the foundation of React render performance; all optimization techniques ultimately work by helping reconciliation make cheaper decisions
→ Architecture: The rules of hooks, the rules of keys, and the "don't define components inside render" rule all exist because of reconciliation's positional identity model

**How it works (3 sentences):**
React's reconciliation applies three O(n) heuristics to diff the previous fiber tree against the new render output: a type change at any position short-circuits the entire subtree (unmount old, mount new); a type match at the same position reuses the fiber and updates only changed props; and the `key` prop provides stable item identity in dynamic lists, enabling React to track items across position changes via move operations rather than destroy-create cycles. The heuristics are implemented in the `beginWork` function of the Fiber work loop — each fiber comparison produces a set of flags (`Placement`, `Update`, `ChildDeletion`) that form an effects list, which the commit phase reads to make the minimum required DOM operations. React's hooks rules are a direct consequence of this model — hooks are stored as a positionally-indexed linked list on each fiber, so any violation of consistent call order corrupts the hook-to-state mapping across renders.

**Company relevance:**
- Microsoft: VS Code Web file tree — stable `key={fileId}` on thousands of file nodes enables drag-to-reorder without DOM destroy-create, preserving scroll position and selection state during tree navigation
- Adobe: Lightroom/Firefly layer lists — key-stable layer components survive layer reordering operations, keeping per-layer UI state (expanded panels, hover states) intact during complex multi-layer drag operations
- Salesforce: Tableau tile layout — `tileId` keys on dashboard tiles enable layout reconfiguration (resize, reorder) via DOM moves rather than fresh mounts; tile query state and scroll positions are preserved
- Cisco: API documentation code samples keyed by language — intentional key change when switching between JavaScript/Python/Go samples forces full remount (clearing "copied" state), a deliberate UX reset via reconciliation

---
✅ Topic 82/486 complete → Continuing to Topic 83: React Scheduler — Priority Lanes, Task Scheduling
