# 105. Render Props Pattern — When Still Useful
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

The render props pattern passes a function as a prop (or as `children`) that a component calls to render its output, giving the consumer control over what renders while the component manages behavior. It was the primary pattern for sharing stateful logic before hooks existed. Today, most render prop use cases are better handled by custom hooks. However, render props remain the right tool in specific cases: when a component needs to render something provided by the consumer at runtime (e.g., `<Virtualized renderRow={fn} />`), when the consumed component library uses the pattern (React DevTools, React Motion), and when a provider component needs to pass dynamic, collocated render logic to a consumer that it doesn't know about at compile time. The `children` variant is the dominant modern form.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Classic Render Prop

```typescript
// Classic: function prop
interface MouseProps {
  render: (position: { x: number; y: number }) => React.ReactNode;
}

function MouseTracker({ render }: MouseProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return <div>{render(position)}</div>;
}

// Usage
<MouseTracker render={({ x, y }) => (
  <span>Mouse at ({x}, {y})</span>
)} />
```

### The Modern Form: Children as Function

```typescript
// children-as-function is idiomatic React today
interface DataProviderProps<T> {
  fetchFn: () => Promise<T>;
  children: (state: { data: T | null; loading: boolean; error: Error | null }) => React.ReactNode;
}

function DataProvider<T>({ fetchFn, children }: DataProviderProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchFn()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { if (e.name !== 'AbortError') { setError(e); setLoading(false); } });
    return () => controller.abort();
  }, [fetchFn]);

  return <>{children({ data, loading, error })}</>;
}

// Usage — consumer controls the UI completely
<DataProvider fetchFn={() => fetchProducts()}>
  {({ data, loading, error }) => {
    if (loading) return <Spinner />;
    if (error) return <Error message={error.message} />;
    return <ProductGrid products={data!} />;
  }}
</DataProvider>
```

### Why Custom Hooks Are Usually Better Today

```typescript
// ❌ Render prop — adds a component to the tree, indirection in JSX
function ProductPage() {
  return (
    <MouseTracker render={({ x, y }) => (
      <div>
        <h1>Products</h1>
        <span>Cursor: ({x}, {y})</span>
      </div>
    )} />
  );
}

// ✅ Custom hook — no extra component, same result
function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const h = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);
  return pos;
}

function ProductPage() {
  const { x, y } = useMousePosition();
  return (
    <div>
      <h1>Products</h1>
      <span>Cursor: ({x}, {y})</span>
    </div>
  );
}
// DevTools shows ProductPage with inline state — no wrapper component
// The hook approach is strictly superior for this use case
```

### When Render Props Are Still the Right Choice

**Case 1: The component MUST render something it doesn't know about structurally**
```typescript
// Virtualized list: the component controls WHEN and HOW MANY rows render
// But it doesn't know what a "row" looks like — that's the consumer's concern
interface VirtualizedListProps<T> {
  items: T[];
  rowHeight: number;
  containerHeight: number;
  renderRow: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
}

function VirtualizedList<T>({ items, rowHeight, containerHeight, renderRow }: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const firstVisible = Math.floor(scrollTop / rowHeight);
  const lastVisible = Math.min(
    firstVisible + Math.ceil(containerHeight / rowHeight) + 1,
    items.length
  );
  const visibleItems = items.slice(firstVisible, lastVisible);

  return (
    <div style={{ height: containerHeight, overflow: 'auto' }} onScroll={e => setScrollTop(e.currentTarget.scrollTop)}>
      <div style={{ height: items.length * rowHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const index = firstVisible + i;
          return renderRow(item, index, {
            position: 'absolute',
            top: index * rowHeight,
            height: rowHeight,
            width: '100%',
          });
        })}
      </div>
    </div>
  );
}

// Usage: consumer controls the row markup
<VirtualizedList
  items={products}
  rowHeight={60}
  containerHeight={500}
  renderRow={(product, _, style) => (
    <div key={product.id} style={style}>
      <img src={product.imageUrl} />
      <span>{product.name}</span>
    </div>
  )}
/>
// A custom hook cannot do this — the COMPONENT needs to decide when to call renderRow
// based on scroll position, which requires component lifecycle (render phase)
```

**Case 2: Prop name `children` for inline composition**
```typescript
// AnimateOnChange: renders "leaving" snapshot and "entering" content simultaneously
interface AnimateOnChangeProps {
  value: string;
  children: (value: string) => React.ReactNode;
}

function AnimateOnChange({ value, children }: AnimateOnChangeProps) {
  const prevValue = usePrevious(value);
  const isChanging = prevValue !== undefined && prevValue !== value;

  return (
    <>
      {isChanging && <div className="leaving">{children(prevValue!)}</div>}
      <div className="entering">{children(value)}</div>
    </>
  );
}

// Consumer writes clean JSX — the render function provides the template
<AnimateOnChange value={currentStep}>
  {(step) => <StepContent step={step} />}
</AnimateOnChange>
// A hook cannot do this — the component renders children(prevValue) and children(value) simultaneously
```

### Performance: Render Props Create Anonymous Functions

```typescript
// ❌ Performance issue: new function reference on every parent render
function Parent() {
  return (
    <DataProvider children={({ data }) => <Child data={data} />} />
  );
  // () => <Child data={data} /> is a new function reference on every Parent render
  // If DataProvider uses React.memo: it re-renders anyway because children prop changed
}

// ✅ Extract to named function or use useCallback
function renderContent({ data }) {
  return <Child data={data} />;
}

function Parent() {
  const handleRender = useCallback(({ data }) => <Child data={data} />, []);
  return <DataProvider children={handleRender} />;
}
// Or just use a custom hook instead — avoids this entirely
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the `AnalyticsTable` component used a render prop `renderCell` to allow different business units to customize cell rendering (currency formatting, date formatting, custom links) without duplicating the table virtualization logic. This is a legitimate render prop use case — the table controls rendering order/position of cells; consumers supply the cell template.

**At FAANG scale:**
- **Microsoft:** `FluentProvider` uses render props for integration with third-party components that need Fluent's theming without being Fluent components
- **React Query:** `useMutation`'s `onSuccess`/`onError` callbacks are a form of this pattern; react-table uses renderCell render props for the same reason as the SAP example
- **Downshift (used by Salesforce components):** entire API is render-prop/hook based — consumers supply `children` function that receives all interaction props and renders their own markup
- **Cisco:** Network topology component uses `renderNode={(node, position) => <.../>}` render prop to allow different views to customize node visualization

---

## 💬 4. Interview Execution

### Sample Answer

> "Render props pass a function (typically `children`) from parent to a component that calls it to render its output. The component owns behavior and lifecycle; the consumer owns the UI template. It was the dominant sharing pattern pre-hooks.
>
> Today, custom hooks have replaced render props for most use cases — no extra component in the tree, cleaner JSX, better DevTools visibility. But render props remain the right choice in two specific cases.
>
> First: when the component must call the render function multiple times or at specific points — like a virtualized list that calls `renderRow` only for visible items at specific positions. A hook can't make that decision; a component can.
>
> Second: when the component needs to render the same template for multiple states simultaneously — like an animation component that renders both the 'leaving' and 'entering' states at the same time using the same `children` template.
>
> The performance concern: `children` functions are recreated on every parent render, breaking memoization on the consumer component. Extract to a named function or wrap in `useCallback` — or use a custom hook instead and avoid the issue entirely."

---

## 💻 5. Code Example

```typescript
// The canonical case where render props beat hooks: downshift-style interaction state provider
'use client';
import { useState, useId, useCallback, useRef } from 'react';

interface ComboboxState {
  isOpen: boolean;
  inputValue: string;
  selectedItem: string | null;
}

interface ComboboxRenderProps extends ComboboxState {
  getInputProps: () => React.InputHTMLAttributes<HTMLInputElement>;
  getMenuProps: () => React.HTMLAttributes<HTMLUListElement>;
  getItemProps: (item: string) => React.HTMLAttributes<HTMLLIElement>;
  getToggleButtonProps: () => React.ButtonHTMLAttributes<HTMLButtonElement>;
}

interface ComboboxProps {
  items: string[];
  onSelect?: (value: string) => void;
  children: (props: ComboboxRenderProps) => React.ReactNode;
}

// Combobox manages keyboard navigation, ARIA, open/close
// Consumer owns the visual markup entirely
function Combobox({ items, onSelect, children }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const menuId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter(item =>
    item.toLowerCase().includes(inputValue.toLowerCase())
  );

  const selectItem = useCallback((item: string) => {
    setSelectedItem(item);
    setInputValue(item);
    setIsOpen(false);
    onSelect?.(item);
    inputRef.current?.focus();
  }, [onSelect]);

  const getInputProps = useCallback((): React.InputHTMLAttributes<HTMLInputElement> => ({
    id: inputId,
    ref: inputRef,
    value: inputValue,
    onChange: (e) => { setInputValue(e.target.value); setIsOpen(true); },
    onFocus: () => setIsOpen(true),
    onKeyDown: (e) => {
      if (e.key === 'Escape') setIsOpen(false);
      if (e.key === 'ArrowDown') { /* focus first item */ }
    },
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-controls': menuId,
    'aria-expanded': isOpen,
  }), [inputValue, isOpen, menuId, inputId]);

  const getMenuProps = useCallback((): React.HTMLAttributes<HTMLUListElement> => ({
    id: menuId,
    role: 'listbox',
    'aria-label': 'Suggestions',
  }), [menuId]);

  const getItemProps = useCallback((item: string): React.HTMLAttributes<HTMLLIElement> => ({
    role: 'option',
    'aria-selected': selectedItem === item,
    onClick: () => selectItem(item),
    onMouseDown: (e) => e.preventDefault(), // prevent input blur before click
  }), [selectedItem, selectItem]);

  const getToggleButtonProps = useCallback((): React.ButtonHTMLAttributes<HTMLButtonElement> => ({
    type: 'button',
    tabIndex: -1,
    onClick: () => setIsOpen(!isOpen),
    'aria-label': isOpen ? 'Close' : 'Open',
  }), [isOpen]);

  // Render props: consumer controls ALL markup; this component provides behavior
  return (
    <>
      {children({
        isOpen, inputValue, selectedItem,
        getInputProps, getMenuProps, getItemProps, getToggleButtonProps,
      })}
    </>
  );
  // Cannot be a hook: component renders nothing itself, caller renders via children
}

// Consumer has FULL markup control — accessible by default
function CountrySearch({ countries }: { countries: string[] }) {
  return (
    <Combobox items={countries} onSelect={console.log}>
      {({ isOpen, getInputProps, getMenuProps, getItemProps, getToggleButtonProps, inputValue }) => (
        <div className="combobox-container">
          <label htmlFor="country-input">Country</label>
          <div className="combobox-input-wrapper">
            <input id="country-input" {...getInputProps()} placeholder="Search countries..." />
            <button {...getToggleButtonProps()}>▼</button>
          </div>
          {isOpen && (
            <ul {...getMenuProps()} className="combobox-menu">
              {countries
                .filter(c => c.toLowerCase().includes(inputValue.toLowerCase()))
                .map(country => (
                  <li key={country} {...getItemProps(country)} className="combobox-item">
                    {country}
                  </li>
                ))
              }
            </ul>
          )}
        </div>
      )}
    </Combobox>
  );
}
```

---

## 🧠 6. Memory Aid

**When to use Render Props today:**
1. Component calls the function multiple times / at controlled points (virtualized lists, animations)
2. Component renders the same template concurrently for multiple states
3. Third-party library already uses the pattern (Downshift, react-table)

**Everything else:** use a custom hook.

**Mnemonic:** **CAVE** — **C**onsumer controls markup, **A**utomatic behavior in component, **V**irtualization use case keeps it relevant, **E**verything else: use a hook.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Pattern literacy: every modern headless UI library either is directly built on render props or has an equivalent API — understanding the pattern means understanding Downshift, React Table, React Motion
→ When to use vs. hook: this is a senior-level tradeoff decision. The answer "hooks replaced render props" is partially correct but misses the cases where render props remain uniquely appropriate

**How it works (1 sentence):**
The consuming component passes a function to the provider component as a prop; the provider calls this function with its internal state as arguments, using the returned JSX as its output — decoupling behavior (provider's responsibility) from visual representation (consumer's responsibility).

**Company relevance:**
- Microsoft: FluentProvider render props for custom rendering in complex data grids
- Adobe: react-table (Tanstack Table) in Spectrum uses renderCell render props
- Salesforce: Downshift-based dropdown patterns in Lightning
- Cisco: Custom topology node rendering via render props in network visualization

---
✅ Topic 105/486 complete → Continuing to Topic 106: Higher Order Components (HOC) — Use Cases & Pitfalls
