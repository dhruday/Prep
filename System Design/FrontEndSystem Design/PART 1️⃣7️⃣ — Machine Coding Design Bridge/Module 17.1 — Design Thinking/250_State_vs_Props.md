# 250 – State vs Props

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

State and Props are the two fundamental data mechanisms in React (and similar component models). **Props** flow down from parent to child (immutable inputs), while **State** is owned and managed within a component (mutable, triggers re-renders). Understanding the distinction is critical in machine coding rounds because it determines your component architecture: what data should be lifted up, what stays local, and what lives in global state. Misplacing state leads to prop drilling, excessive re-renders, or components that can't be reused.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Decision Framework: State vs Props

| Data | State or Prop? | Why |
|------|---------------|-----|
| User input value | **State** in the input component (or parent if controlled) | Changes over time, owned by form |
| User profile data | **Prop** (from container/context) | Doesn't change within the component, comes from parent |
| isOpen (modal) | **State** in the component that controls the modal | UI toggle, local concern |
| Selected item ID | **State** lifted to the nearest common ancestor | Multiple children need it |
| Theme/locale | Neither — **Context** | Cross-cutting concern, many consumers |
| API response data | **State** in custom hook or global store | Async, cacheable |

### The State Placement Algorithm

```
1. Which components render based on this data?
2. Find their closest common ancestor
3. Place state there (or in a custom hook collocated there)
4. Pass down via props (or context if > 2 levels)
```

### Controlled vs Uncontrolled Components

```typescript
// Controlled: parent owns the state
function SearchForm() {
  const [query, setQuery] = useState(''); // state in parent
  return <SearchInput value={query} onChange={setQuery} />; // props to child
}

// Uncontrolled: component owns its own state
function SearchInput({ defaultValue, onSearch }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <input ref={inputRef} defaultValue={defaultValue} />;
}
```

**Rule**: If a parent needs to read or control the value → **controlled** (state lifted up). If only the component itself uses it → **uncontrolled** (internal state).

### Derived State (Avoid!)

```typescript
// ❌ Anti-pattern: duplicating props into state
function BadComponent({ items }: { items: Item[] }) {
  const [filteredItems, setFilteredItems] = useState(items); // duplicate!
  // Now items prop and filteredItems can get out of sync
}

// ✅ Correct: derive from props
function GoodComponent({ items }: { items: Item[] }) {
  const filteredItems = useMemo(() => items.filter(i => i.active), [items]);
}
```

### State Colocation Principle

Keep state as close to where it's used as possible:
- Form validation error → state in the form field component
- Modal open/close → state in the component that triggers it
- Selected tab → state in the Tabs container
- User authentication → global state (context/store)

### Anti-Patterns

- ❌ Prop drilling through 5+ levels — use context or composition
- ❌ Copying props to state — causes sync bugs. Derive instead.
- ❌ Everything in global store — makes components non-reusable and tightly coupled
- ❌ Using refs to avoid state — loses React's reactivity model

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: React Documentation
React's official docs dedicate an entire section to "Thinking in React" which centers on identifying state: what data changes? who owns it? how it flows. Meta/Facebook engineers follow this rigorously.

### Hruday @ SAP Labs
In UI5/Fiori, this maps to the Model-View-Controller pattern: Properties (props) are set by the parent control, while the model (state) is managed by the controller. At SAP, I enforced clear data flow in our component architecture — OData model bindings are like props (data flows in), local JSON models are like state.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I think of props as function parameters and state as local variables. Props flow down (immutable inputs from parent), state is owned and mutable within a component.*

*My decision process: (1) Does this data change? If no, it's a constant or prop. (2) Can it be derived from existing props/state? If yes, use useMemo, don't duplicate into state. (3) Which components need it? Place state in their closest common ancestor. (4) Is it crossing > 2 layers? Consider context.*

*I follow the colocation principle — state lives as close to its consumer as possible. Modal open/close is local state. Form values can be controlled (parent state) or uncontrolled (local ref), depending on whether the parent needs access.*

*The biggest anti-pattern I've seen is copying props into state — it creates sync bugs. I always derive computed values with useMemo instead."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// State placement in a Todo app — demonstrating the decision process
function TodoApp() {
  // ✅ State here: both TodoList and TodoStats need this data
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // ✅ Derived, not state — computed from todos + filter
  const filteredTodos = useMemo(
    () => filter === 'all' ? todos : todos.filter(t => t.completed === (filter === 'completed')),
    [todos, filter]
  );

  return (
    <div>
      <TodoInput onAdd={(text) => setTodos(prev => [...prev, { id: crypto.randomUUID(), text, completed: false }])} />
      <FilterBar filter={filter} onChange={setFilter} /> {/* prop: current filter; callback prop: onChange */}
      <TodoList todos={filteredTodos} onToggle={(id) => setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))} />
      <TodoStats total={todos.length} completed={todos.filter(t => t.completed).length} /> {/* props: derived data */}
    </div>
  );
}

// TodoInput owns its own local state (text input value)
function TodoInput({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState(''); // ✅ Local state — only this component needs it
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onAdd(text.trim()); setText(''); } }}>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="Add todo" />
    </form>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Props = inputs from parent (read-only). State = data owned by this component (mutable, triggers re-render). Derived = useMemo from props/state (never copy props into state). Place state at the nearest common ancestor. > 2 layers = context."** Decision: Does it change? → state or prop. Can it be derived? → useMemo. Who needs it? → closest common ancestor. Too deep? → context.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Fundamental to component architecture. Wrong state placement = prop drilling, sync bugs, or unnecessary re-renders. Interviewers use this to assess your React maturity.
**How:** Identify which data changes → place state at nearest common ancestor → pass via props → derive instead of duplicating → context for cross-cutting concerns.
**Companies:** All four companies test this in machine coding rounds. Microsoft/Adobe test deeply with complex component trees.
