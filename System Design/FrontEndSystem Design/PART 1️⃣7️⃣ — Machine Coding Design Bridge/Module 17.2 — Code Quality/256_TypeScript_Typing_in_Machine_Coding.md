# 256 – TypeScript Typing in Machine Coding Rounds

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Using TypeScript effectively in machine coding rounds demonstrates type safety awareness, API design skills, and production-quality thinking. It's not about complex types — it's about **well-structured interfaces** (clear prop types), **discriminated unions** (for state machines), **generic components** (for reusable data tables), and **proper event typing** (React.ChangeEvent, React.FormEvent). Good TypeScript usage signals seniority; using `any` everywhere signals the opposite.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Essential Patterns for Interviews

**1. Props Interfaces:**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'; // union, not string
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}
```

**2. Discriminated Unions for State:**
```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: T };

// TypeScript narrows the type when you check status
function render(state: AsyncState<User[]>) {
  switch (state.status) {
    case 'loading': return <Spinner />;
    case 'error': return <Error message={state.error} />; // TS knows error exists
    case 'success': return <List items={state.data} />;   // TS knows data exists
  }
}
```

**3. Generic Components:**
```typescript
interface SelectProps<T> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  getLabel: (item: T) => string;
  getKey: (item: T) => string;
}

function Select<T>({ options, value, onChange, getLabel, getKey }: SelectProps<T>) {
  // T is inferred from usage — no need for explicit generics at call site
}
```

**4. Event Types:**
```typescript
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value);
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); /* ... */ };
const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit(); };
```

### What NOT to Do

```typescript
// ❌ Don't use any
const handleClick = (data: any) => { /* ... */ };

// ❌ Don't use as for type assertions (usually)
const user = response as User; // unsafe

// ✅ Use type guard instead
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'name' in data;
}
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, our TypeScript codebase used strict mode with no-any lint rule. Discriminated unions for OData response states (loading/error/success) and generic components for table columns were standard patterns.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I use TypeScript intentionally in machine coding rounds: explicit interfaces for props (no inline types), discriminated unions for state machines (loading/error/success), generic components for reusable list/table components, and proper React event types (ChangeEvent, FormEvent, KeyboardEvent). I avoid `any` completely — if I'm unsure of a type, I use `unknown` with a type guard. This shows type safety awareness and production discipline."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// TypeScript-strong machine coding example
type Status = 'idle' | 'loading' | 'error' | 'success';

interface Todo { id: string; text: string; completed: boolean; }

interface TodoAppState {
  todos: Todo[];
  status: Status;
  error: string | null;
  filter: 'all' | 'active' | 'completed';
}

type TodoAction =
  | { type: 'ADD'; payload: string }
  | { type: 'TOGGLE'; payload: string }
  | { type: 'DELETE'; payload: string }
  | { type: 'SET_FILTER'; payload: TodoAppState['filter'] };

function todoReducer(state: TodoAppState, action: TodoAction): TodoAppState {
  switch (action.type) {
    case 'ADD':
      return { ...state, todos: [...state.todos, { id: crypto.randomUUID(), text: action.payload, completed: false }] };
    case 'TOGGLE':
      return { ...state, todos: state.todos.map(t => t.id === action.payload ? { ...t, completed: !t.completed } : t) };
    case 'DELETE':
      return { ...state, todos: state.todos.filter(t => t.id !== action.payload) };
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
  }
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"TS in interviews = Props Interface + Discriminated Unions + Generics + Event Types."** Always: explicit props interface, union types for state (`'loading' | 'error' | 'success'`), generic `<T>` for reusable components. Never: `any`, unsafe type assertions (`as`). Use `unknown` + type guards instead. Event types: `React.ChangeEvent<HTMLInputElement>`, `React.FormEvent<HTMLFormElement>`.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** TypeScript proficiency is expected at all four target companies. Using it effectively demonstrates type safety and API design skills.
**How:** Props interfaces, discriminated unions, generic components, proper event types. Avoid `any`, use `unknown` + type guards.
**Companies:** **Microsoft** (TypeScript creators), **Cisco** (Angular/TS-heavy), **Adobe** (strict TS usage), Salesforce (LWC with TS).
