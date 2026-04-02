# 91. useCallback — Referential Stability, Common Misuse
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

`useCallback(fn, deps)` returns a memoized version of a callback function — the same function reference is returned on every render unless a dependency changes. It is exactly equivalent to `useMemo(() => fn, deps)`. The primary use case is giving a stable function reference to a memoized child component (one wrapped in `React.memo`) or an effect dependency, which without stability would break the memoization or trigger unnecessary effect re-runs. The common misuse: wrapping every function in `useCallback` unconditionally. A `useCallback` with no `React.memo` consumer and no `useEffect` deps usage provides zero benefit — the function is recreated on every render anyway and never compared against a previous reference for any purpose. Profile and memoize specifically, not defensively.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### `useCallback` Internals

```typescript
// useCallback is literally:
const memoizedFn = useCallback(fn, deps);
// ≡
const memoizedFn = useMemo(() => fn, deps);
```

Stored on the fiber's hook linked list: the previous function and deps. On each render, `Object.is` comparison per dep. If same → return the previous function object. If changed → store new function and new deps, return new function.

**The critical point:** The same function reference means: `callbackFrom_render_1 === callbackFrom_render_2` is `true`. This is what enables React.memo's shallow comparison to see "prop didn't change."

### When `useCallback` Provides Value

**Case 1: Stabilizing a handler passed to a `React.memo` child**

```typescript
const ListItem = React.memo(function ListItem({
  item,
  onDelete,
}: {
  item: Item;
  onDelete: (id: string) => void;
}) {
  // React.memo: only re-renders if props change by reference
  // onDelete must be stable or this memoization achieves nothing
  return (
    <div>
      {item.name}
      <button onClick={() => onDelete(item.id)}>Delete</button>
    </div>
  );
});

// ❌ Without useCallback: new function reference every render → ListItem always re-renders
function List({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    deleteItem(id);
  };
  // handleDelete is NEW every render → React.memo on ListItem sees new prop → re-renders all items
  // including the 99 items that weren't deleted → wasted renders

  return items.map(item => (
    <ListItem key={item.id} item={item} onDelete={handleDelete} />
  ));
}

// ✅ With useCallback: stable function reference
function List({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleDelete = useCallback((id: string) => {
    deleteItem(id);
  }, []);  // [] — function doesn't close over any reactive values

  return items.map(item => (
    <ListItem key={item.id} item={item} onDelete={handleDelete} />
    // handleDelete is same reference → React.memo bails out ✓
  ));
}
```

**Case 2: Stabilizing a function used in `useEffect` deps**

```typescript
// ❌ Without useCallback: new fetchData every render → effect re-runs every render
function DataComponent({ endpoint }: { endpoint: string }) {
  const [data, setData] = useState(null);

  const fetchData = async () => {
    const result = await fetch(endpoint).then(r => r.json());
    setData(result);
  };
  // fetchData is new every render → [fetchData] changes every render

  useEffect(() => {
    fetchData();
  }, [fetchData]);  // triggers on every render — infinite if fetchData calls setData

  return <div>{JSON.stringify(data)}</div>;
}

// ✅ With useCallback
function DataComponent({ endpoint }: { endpoint: string }) {
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    const result = await fetch(endpoint).then(r => r.json());
    setData(result);
  }, [endpoint]);  // only recreated when endpoint changes

  useEffect(() => {
    fetchData();
  }, [fetchData]);  // only re-runs when endpoint changes

  return <div>{JSON.stringify(data)}</div>;
}
```

**Case 3: The stable callback ref pattern (alternative to useCallback)**

When a callback is used in effects but doesn't need to be passed to children:

```typescript
// Alternative to useCallback for effect callbacks — no deps needed
function Component({ onEvent }: { onEvent: (data: string) => void }) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;  // always up to date

  useEffect(() => {
    const handler = (data: string) => onEventRef.current(data);
    eventSource.on('event', handler);
    return () => eventSource.off('event', handler);
  }, []);  // [] — no dep on onEvent, accessed via ref
}
// This avoids useCallback entirely for the effect case
// Use callback ref when function is only used in effects
// Use useCallback when function is also passed to memoized children
```

### When `useCallback` Provides NO Value

**Case 1: No `React.memo` children, no effect deps**

```typescript
// ❌ Pointless useCallback — nobody compares the function reference
function SimpleForm() {
  const [value, setValue] = useState('');

  // handleChange is wrapped in useCallback — but:
  // 1. The <input> onChange receives it — but inputs don't use React.memo
  // 2. It's not in any useEffect deps
  // → The memoization buys nothing, just adds overhead
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  // ✅ Just write the function directly
  const handleChangeDirect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  return <input value={value} onChange={handleChangeDirect} />;
}
```

**Case 2: Deps that change on every render — breaking the memoization**

```typescript
// ❌ The deps contain an unstable reference — useCallback recreates every render anyway
function Component({ config }) {
  const options = { filter: config.filter };  // new object every render

  // options is new every render → useCallback recreates every render
  // Result: no memoization at all + overhead of checking deps
  const processData = useCallback((data: Data[]) => {
    return data.filter(d => d.status === options.filter);
  }, [options]);  // options is always new → always recreates

  // ✅ Fix: depend on the primitive value
  const processDataFixed = useCallback((data: Data[]) => {
    return data.filter(d => d.status === config.filter);
  }, [config.filter]);  // primitive string — stable when filter doesn't change
}
```

**Case 3: Memoized component that then gets OTHER unstable props**

```typescript
// ❌ useCallback on handleDelete is useless because `style` is always new (object in render)
const ListItem = React.memo(({ item, onDelete, style }) => <div style={style}>{item.name}</div>);

function List({ items }) {
  const onDelete = useCallback(id => deleteById(id), []);

  return items.map(item => (
    <ListItem
      key={item.id}
      item={item}
      onDelete={onDelete}    // stable ✓
      style={{ color: 'red', margin: 8 }}  // ❌ new object every render — breaks memoization
    />
  ));
  // React.memo bails out only when ALL props are stable
  // ONE unstable prop (style) breaks the entire memoization
  // useCallback on onDelete saved nothing
}
```

### Dependency Rules for `useCallback`

Same rules as `useEffect` and `useMemo` — exhaustive-deps ESLint rule applies:

```typescript
function SearchBox({ userId, onResultSelect }) {
  const [query, setQuery] = useState('');

  // ❌ Stale closure: userId and onResultSelect used but not in deps
  const handleSearch = useCallback(async () => {
    const results = await searchAPI(query, userId);  // userId from closure — stale!
    onResultSelect(results[0]);  // onResultSelect from closure — stale!
  }, [query]);  // missing userId and onResultSelect

  // ✅ All used values in deps
  const handleSearchFixed = useCallback(async () => {
    const results = await searchAPI(query, userId);
    onResultSelect(results[0]);
  }, [query, userId, onResultSelect]);  // complete deps
  // But: if onResultSelect is new every parent render, this callback recreates every render
  // → parent should stabilize onResultSelect with useCallback first
}
```

### Combining `useCallback` and `React.memo` — The Complete Pattern

For full optimization:

```typescript
// Must satisfy THREE conditions for React.memo to work:
// 1. Child wrapped in React.memo
// 2. ALL callback props from parent are stabilized with useCallback
// 3. ALL object/array props from parent are stabilized with useMemo

interface RowProps {
  row: DataRow;
  onEdit: (id: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
  formatCurrency: (value: number) => string;
}

const DataRow = React.memo(function DataRow({ row, onEdit, onDelete, formatCurrency }: RowProps) {
  return (
    <tr>
      <td>{row.name}</td>
      <td>{formatCurrency(row.amount)}</td>
      <td>
        <button onClick={() => onEdit(row.id, 'name', 'new')}>Edit</button>
        <button onClick={() => onDelete(row.id)}>Delete</button>
      </td>
    </tr>
  );
});

function DataTable({ rows, currency }: { rows: DataRow[]; currency: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // ✅ All callbacks stabilized
  const handleEdit = useCallback((id: string, field: string, value: string) => {
    updateRow(id, field, value);
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteRow(id);
  }, []);

  // ✅ Currency formatter stabilized — expensive Intl.NumberFormat construction
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  }, [currency]);  // only re-creates when currency changes

  return (
    <table>
      {rows.map(row => (
        <DataRow
          key={row.id}
          row={row}
          onEdit={handleEdit}         // stable ✓
          onDelete={handleDelete}     // stable ✓
          formatCurrency={formatCurrency}  // stable ✓
          // editingId state changes don't cause DataRow re-renders now ✓
        />
      ))}
    </table>
  );
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the product table had 200+ `<ProductRow>` components. A `React.memo` was added to `ProductRow`, but rows kept re-rendering on every filter change — including rows not affected by the filter. Investigation: the `onExpand` and `onSelect` handlers were defined inline in the parent render function (new reference every render). Adding `useCallback` with stable deps made `React.memo` actually work — row re-renders dropped from 200 per interaction to only affected rows (typically 1-5). Render time dropped from 180ms to 15ms.

At Oracle, a React form library component was calling `useCallback` on every form field change handler. Since the form state was an object in the parent, and functional update `setFormState(prev => ...)` was used (setFormState is stable), the `useCallback` deps were `[]` for all handlers — stable functions. This enabled the individual field components (wrapped in `React.memo`) to bail out correctly — only the changed field re-rendered, not all 30 fields.

**At FAANG scale:**
- **Microsoft (Outlook Web):** Email list with 1000+ items — `React.memo` on `EmailRow`, `useCallback` on all action handlers (archive, delete, flag, mark-read) with `[]` deps (all use dispatch from Redux); selecting one email doesn't re-render all 999 others
- **Adobe (Bridge):** Asset grid with thumbnail actions — `useCallback` on `onSelect`, `onPreview`, `onDownload` with stable deps; prevents 1000+ asset thumbnails from re-rendering when the filter panel updates
- **Salesforce (Analytics Builder):** Chart configuration callbacks — `useCallback` wraps callbacks passed to `React.memo`-wrapped chart components; filter changes don't cause all chart panels to re-render
- **Cisco (Device Manager):** Device list actions — `useCallback` on device action handlers (reboot, backup, configure) ensures the 500-device list only re-renders devices whose status actually changes

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "useCallback memoizes a function reference — it's exactly useMemo for functions. The value is that the same function reference allows React.memo-wrapped children to correctly bail out, and prevents unnecessary effect re-runs when a function is in useEffect deps.
>
> The key question to ask before adding useCallback: 'Who is comparing this function reference?' If the answer is: a React.memo child comparing its onX prop, or a useEffect deps array — then useCallback provides real value. If nobody is comparing the reference — no memoized consumer, no effect dep — then useCallback is pure overhead.
>
> The other mistake is ensuring the deps are stable themselves. If a useCallback has an object in its deps array, and that object is created in render, the callback recreates every render anyway — you've added overhead with no memoization benefit. The pattern is: stabilize from the leaves up — primitives in useCallback deps, useMemo for objects before using them as deps, useCallback on functions before passing to React.memo children.
>
> As a rule, I only add useCallback when I can trace the performance benefit to the screen — through a React.memo bailout or a prevented effect re-run. Defensive useCallback everywhere is React performance theater."

### Likely Follow-up Questions

1. **Can `useCallback` be used without `React.memo`?** → Yes — for the effect deps use case. If a function is used as a dependency of `useEffect`, `useCallback` ensures the effect doesn't re-run on every render. But the most common use case pairs it with `React.memo`.
2. **How do you know when to add `React.memo` + `useCallback`?** → Profile first with React DevTools Profiler. If a component renders frequently and its render is expensive, and if the cause is a parent re-render that doesn't actually change the component's props, then `React.memo` is the tool. `useCallback` is required in the parent for any function prop passed to the memoized component.
3. **What's the cost of `useCallback`?** → Same as `useMemo`: closure allocation, deps array allocation, `Object.is` calls per dep. These are small but nonzero. On a component that renders 1000 times per second (e.g., drag handlers), accumulated `useCallback` overhead can add up. In typical UI components, the overhead is negligible but the benefit is also small unless there are expensive memoized children.
4. **What does React Compiler mean for `useCallback`?** → The React Compiler (React 19) can automatically memo-ize function references. If using the compiler, manually adding `useCallback` may be redundant — the compiler inserts it where needed. However, developers should still understand the underlying concept since the compiler doesn't change the fundamental behavior.

### Senior Signal

> "I use a mental checklist: (1) Is there a React.memo consumer for this function prop? (2) Is this function in a useEffect deps array? If neither — no useCallback. If yes — add it with correct deps. The second layer: verify the deps are themselves stable. I've seen teams add useCallback everywhere but still have memoization breaks because the deps contained new object references. The work to fix that is useMemo on the objects in the parent, or refactoring to pass primitives. Sometimes the right answer is: don't pass objects as props at all — restructure so memoized children only receive primitive props, and you barely need useCallback at all."

---

## 💻 5. Code Example

```typescript
import React, { useState, useCallback, useMemo, memo } from 'react';

// ========================
// 1. Complete React.memo + useCallback pattern
// ========================
interface Tag { id: string; label: string; color: string; }

const TagChip = memo(function TagChip({
  tag,
  onRemove,
  onEdit,
}: {
  tag: Tag;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  console.log(`TagChip render: ${tag.label}`);  // should only log when tag data changes
  return (
    <span style={{ background: tag.color }}>
      {tag.label}
      <button onClick={() => onRemove(tag.id)}>×</button>
      <button onClick={() => onEdit(tag.id)}>✏</button>
    </span>
  );
});

function TagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);

  // ✅ Stable: setTags is stable → [] deps sufficient, no stale closure risk
  const handleRemoveTag = useCallback((id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
  }, []);  // [] — no reactive values needed (using functional setState)

  // ✅ Stable: only changes if we add logic that depends on reactive values
  const handleEditTag = useCallback((id: string) => {
    setEditingTagId(id);
  }, []);

  // ✅ inputValue changes often — but this callback doesn't need to be stable
  // It's only used by plaintext <input>, not a React.memo component → no useCallback needed
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div>
      <input value={inputValue} onChange={handleInputChange} />
      {tags.map(tag => (
        <TagChip
          key={tag.id}
          tag={tag}
          onRemove={handleRemoveTag}  // stable ✓ — TagChip won't re-render on inputValue changes
          onEdit={handleEditTag}      // stable ✓
        />
      ))}
    </div>
  );
}

// ========================
// 2. useCallback for useEffect deps
// ========================
function useRealtimeData<T>(
  endpoint: string,
  transform: (raw: unknown) => T,
  pollingInterval: number
) {
  const [data, setData] = useState<T | null>(null);

  // transform might come from props/state — needs to be in deps
  // But if transform is defined inline in the calling component, it's new every render
  // Parent MUST useCallback-ify it, or we stabilize here with the ref pattern
  const stableTransform = useCallback(transform, [transform]);
  // ^ this only helps if parent stabilized transform with useCallback

  // Alternative: use ref pattern to avoid needing transform in deps
  const transformRef = React.useRef(transform);
  transformRef.current = transform;

  useEffect(() => {
    const controller = new AbortController();
    const fetchAndUpdate = async () => {
      fetch(endpoint, { signal: controller.signal })
        .then(r => r.json())
        .then(raw => setData(transformRef.current(raw)))  // always fresh via ref
        .catch(() => {});
    };

    fetchAndUpdate();
    const id = setInterval(fetchAndUpdate, pollingInterval);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [endpoint, pollingInterval]);  // transform NOT needed in deps — accessed via ref

  return data;
}

// ========================
// 3. Identifying useless useCallback
// ========================
function FormField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // ❌ These are NOT memoized components — no useCallback benefit
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  // ✅ Just pass the handler directly — <input> is a native element, not React.memo
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      // Inline function: new every render, but input doesn't use React.memo === no impact
    />
  );
}

// ========================
// 4. The broken-by-unstable-dep pattern
// ========================
interface Config { endpoint: string; options: RequestInit; }

function DataLoader({ config }: { config: Config }) {
  const [data, setData] = useState(null);

  // ❌ config.options is passed as object — if config is new every render, this is useless
  const fetchWithConfig = useCallback(async () => {
    const res = await fetch(config.endpoint, config.options);
    setData(await res.json());
  }, [config]);  // config is new every render if parent creates object inline → no memoization

  // ✅ Depend on primitives instead
  const fetchWithPrimitives = useCallback(async () => {
    const res = await fetch(config.endpoint, config.options);
    setData(await res.json());
  }, [config.endpoint]);  // only recreated when endpoint changes
  // config.options passed via ref pattern if it's truly needed

  useEffect(() => { fetchWithPrimitives(); }, [fetchWithPrimitives]);

  return <div>{JSON.stringify(data)}</div>;
}
```

---

## 🧠 6. Memory Aid

**Mental Model:** `useCallback` is a VIP membership card for a function. The card is only valuable if somewhere there's a bouncer checking it at the door (a `React.memo` component or `useEffect` deps array). If there's no bouncer, the card is just extra weight in your wallet.

**If you go blank:** "Same as useMemo for functions. Only useful when: (1) passing to React.memo child, or (2) in useEffect deps. No consumer comparing the reference = no benefit. Deps must be stable themselves for memoization to work."

**Mnemonic:** **SCAN** — **S**table reference needed, **C**onsumer (React.memo or effect), **A**ll deps must be stable themselves, **N**o consumer = no benefit.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Performance: `useCallback` is the enabler for `React.memo` to work effectively — without stabilized function references, memoized children re-render despite being wrapped in `React.memo`; with stabilized references, React can skip re-rendering 990 out of 1000 list items when only 10 changed
→ Correctness: Functions in `useEffect` deps that change every render cause effects to re-run every render — `useCallback` with correct deps makes effects run only when logically required
→ Code reasoning: Understanding when `useCallback` helps vs hurts requires understanding React's entire rendering model — props comparison, bailout conditions, and effect scheduling; it's a senior-level topic that distinguishes surface-level React knowledge from deep architectural understanding

**How it works (3 sentences):**
`useCallback(fn, deps)` is syntactic sugar for `useMemo(() => fn, deps)` — it stores both the function reference and the deps array on the fiber's hook linked list, returning the same function reference when all deps pass `Object.is` equality, and only creating a new function reference (calling the `fn` argument) when a dep changes. The returned stable function reference enables `React.memo`'s shallow prop comparison to correctly determine "this prop hasn't changed, skip re-rendering this child" — without it, every parent render produces a new function reference even if the function's behavior is identical, making `React.memo` unable to bail out. The common misuse — `useCallback` on functions passed to non-memoized components or not used in any effect deps — adds the overhead of closure allocation, array allocation, and deps comparison on every render with zero performance benefit, making the code more complex without improving its performance characteristics.

**Company relevance:**
- Microsoft: Outlook Web email list — `useCallback` on action handlers (archive, delete, mark-read, flag) paired with `React.memo` on `EmailListItem`; selecting one email doesn't re-render all other list items; critical for performance on inboxes with 1000+ visible emails
- Adobe: Photoshop Web tool palette — `useCallback` on tool activation handlers; switching tools doesn't re-render all 50+ tool buttons (only the activated/deactivated ones); `React.memo` + `useCallback` enabled 40% fewer renders during tool switching
- Salesforce: Builder canvas drag callbacks — `useCallback` on `onNodeMove`, `onEdgeCreate`, `onNodeDelete` handlers; drag operations shouldn't cause all 200+ canvas elements to re-render on every mouse move coordinate update
- Cisco: Network config tree — `useCallback` on expand/collapse/select handlers for the infinite tree; collapsing a node shouldn't re-render all sibling branches; `React.memo` + `useCallback` on tree nodes reduced re-renders during tree navigation by 95%

---
✅ Topic 91/486 complete → Continuing to Topic 92: useReducer — When to Prefer Over useState
