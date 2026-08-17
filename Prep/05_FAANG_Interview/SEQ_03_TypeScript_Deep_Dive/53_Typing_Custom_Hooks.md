# 53. Typing Custom Hooks
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Custom hooks need explicit return type annotations when they return tuples, because TypeScript infers arrays — not tuples — by default. A hook returning `[value, setValue]` will be inferred as `(T | Dispatch<SetStateAction<T>>)[]`, losing the positional type information. The fixes are: annotate the return as `readonly [T, Dispatch<SetStateAction<T>>]`, use `as const`, or wrap the return in an object. For hooks returning objects, inference is usually fine. Generic hooks require constraint-aware type parameters to preserve callers' types.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Tuple Problem

```typescript
// ❌ Problem: TypeScript infers array, not tuple
function useToggle(initial = false) {
  const [state, setState] = React.useState(initial);
  const toggle = () => setState(s => !s);
  return [state, toggle];  // inferred as: (boolean | (() => void))[]
}

const [isOpen, openToggle] = useToggle();
openToggle; // Type: boolean | (() => void) — ❌ not (() => void)
```

**Fix 1 — explicit return type annotation:**
```typescript
function useToggle(initial = false): [boolean, () => void] {
  const [state, setState] = React.useState(initial);
  const toggle = () => setState(s => !s);
  return [state, toggle];
}

const [isOpen, toggle] = useToggle();
toggle; // ✅ Type: () => void
isOpen; // ✅ Type: boolean
```

**Fix 2 — `as const` on return (tuple inference):**
```typescript
function useToggle(initial = false) {
  const [state, setState] = React.useState(initial);
  const toggle = () => setState(s => !s);
  return [state, toggle] as const; // readonly [boolean, () => void]
}
```

**Fix 3 — return an object (no tuple problem):**
```typescript
function useToggle(initial = false) {
  const [state, setState] = React.useState(initial);
  const toggle = () => setState(s => !s);
  return { state, toggle }; // object inference is fine — no position ambiguity
}

const { state: isOpen, toggle } = useToggle();
```

### Generic Custom Hooks

**Generic `useFetch<T>` — preserve caller's type:**
```typescript
type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function useFetch<T>(url: string): FetchState<T> {
  const [state, setState] = React.useState<FetchState<T>>({ status: 'idle' });

  React.useEffect(() => {
    if (!url) return;
    setState({ status: 'loading' });

    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then(data => setState({ status: 'success', data }))
      .catch(error => {
        if (error.name !== 'AbortError') {
          setState({ status: 'error', error: error as Error });
        }
      });

    return () => controller.abort();
  }, [url]);

  return state;
}

// Usage
const state = useFetch<SalesOrder[]>('/api/orders');
if (state.status === 'success') {
  state.data; // SalesOrder[] — fully typed
}
```

**Generic `useLocalStorage<T>` — typed persistence:**
```typescript
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [stored, setStored] = React.useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const set = (value: T) => {
    setStored(value);
    window.localStorage.setItem(key, JSON.stringify(value));
  };

  return [stored, set];
}

const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
setTheme('dark');  // ✅
setTheme('other'); // ❌ not 'light' | 'dark'
```

### Overloaded Return Types (conditional return based on arg)

```typescript
// Overload: when called with no default, returns T | undefined; with default, returns T
function useQueryParam(key: string): string | undefined;
function useQueryParam(key: string, defaultValue: string): string;
function useQueryParam(key: string, defaultValue?: string): string | undefined {
  const url = new URL(window.location.href);
  return url.searchParams.get(key) ?? defaultValue;
}

const id = useQueryParam('id');          // string | undefined
const tab = useQueryParam('tab', 'list'); // string (never undefined)
```

### Hooks That Return State + Actions

**Prefer object return for hooks with many values:**
```typescript
interface UseFormReturn<T> {
  values:   T;
  errors:   Partial<Record<keyof T, string>>;
  touched:  Partial<Record<keyof T, boolean>>;
  isValid:  boolean;
  handleChange: (field: keyof T) => React.ChangeEventHandler<HTMLInputElement>;
  handleSubmit: (onSubmit: (values: T) => void) => React.FormEventHandler<HTMLFormElement>;
  reset: () => void;
}

function useForm<T extends Record<string, unknown>>(
  initialValues: T,
  validate?: (values: T) => Partial<Record<keyof T, string>>
): UseFormReturn<T> {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({});

  const handleChange = (field: keyof T): React.ChangeEventHandler<HTMLInputElement> =>
    (e) => {
      setValues(v => ({ ...v, [field]: e.target.value }));
      setTouched(t => ({ ...t, [field]: true }));
    };

  const handleSubmit = (onSubmit: (v: T) => void): React.FormEventHandler<HTMLFormElement> =>
    (e) => {
      e.preventDefault();
      const errs = validate?.(values) ?? {};
      if (Object.keys(errs).length === 0) onSubmit(values);
      else setErrors(errs);
    };

  const isValid = Object.keys(errors).length === 0;

  return { values, errors, touched, isValid, handleChange, handleSubmit, reset: () => setValues(initialValues) };
}
```

### ⚠️ Anti-Patterns & Pitfalls

- **Tuple return without annotation or `as const`** — inferred array loses positional type information; always annotate tuples
- **`useState<any>` inside generic hook** — defeats generic typing; use the generic parameter: `useState<T>()`
- **Not memoizing returned functions in generic hooks** — every render creates new function references; consumer components receiving these as props will re-render unnecessarily. Wrap in `useCallback`.
- **Not documenting inference intent** — hooks like `useQueryParam` with overloads need clear JSDoc; without it, consumers don't know when they get `T` vs `T | undefined`

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
At SAP Labs, the OData service layer was wrapped in a generic `useODataList<T extends ODataEntity>(ServiceClass)` hook. It returned `{ data: T[]; loading: boolean; error: ODataError | null; refetch: () => void }` — the object return form gave clear naming, and the generic parameter preserved the entity type from the service class all the way to the component's `data` prop. At Bosch, a `useWebSocketMessage<T extends WsMessage>()` hook with a discriminated union return type ensured every message consumer destructured the correct message shape.

**At FAANG scale:**
- **Microsoft:** Fluent UI and Teams React Component Library expose custom hooks for controlled components — all return typed objects, never raw tuples
- **Adobe:** React Spectrum's `useListData<T>`, `useAsyncList<T>`, `useOverlayTriggerState` — all generic hooks with explicit return type interfaces
- **Salesforce:** Platform custom hooks for `@wire` adapter results use generic typing to flow record types through
- **Cisco:** Webex Web SDK React wrapper exposes typed hooks like `useParticipants<Meeting>()` — generic return types

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Custom hooks in TypeScript have one main gotcha: tuple returns. TypeScript infers arrays by default, which loses positional types. For a hook returning `[value, setter]`, I either declare the return type explicitly as a tuple annotation, or use `as const`. For more than two return values, I switch to an object — named properties, no positional ambiguity, and inference just works. For generic hooks, I ensure the type parameter flows through to both the state and any returned actions. The most useful advanced pattern is function overloads on hooks: `useQueryParam(key)` → `string | undefined`, but `useQueryParam(key, default)` → `string` — the second overload eliminates the undefined check at the call site."

### Likely Follow-up Questions
1. **Why does `return [value, handler]` lose type information?** → TypeScript infers `(T | Handler)[]` (array with union element type) instead of `[T, Handler]` (tuple with positional types). Fix with `as const` or explicit return type.
2. **When would you use overloads on a hook?** → When the return type changes based on which arguments are provided — e.g., with-default vs without-default variants
3. **How do you type a hook that internally uses `useReducer`?** → Type the state and action as discriminated union: `useReducer<Reducer<State, Action>>(reducer, initialState)` — TypeScript infers the current state and dispatch type
4. **How do you type a hook that returns a callback?** → Annotate with `React.Callback<(args) => void>` pattern; better — use `useCallback` with typed parameters explicitly declared

### How to Signal Senior Thinking
> "The architectural pattern I reach for in large apps is a domain hook that composes several primitive hooks and returns a typed feature interface. `useCartFeature()` composes `useFetch`, `useLocalStorage`, `useFormState`, and exposes `{ items, addItem, removeItem, total, checkout }` with precise types. The return type is declared as an interface at the top of the file — this becomes the public API contract that components depend on, decoupled from the implementation. If you swap the underlying store from local state to Zustand, the interface stays the same."

---

## 💻 5. Code Example

```typescript
// ─── Generic useFetch with abort and type safety ─────────────────────

type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T; cachedAt: number }
  | { status: 'error'; error: Error };

interface UseFetchReturn<T> {
  state:   FetchState<T>;
  refetch: () => void;
}

function useFetch<T>(url: string | null): UseFetchReturn<T> {
  const [state, setState] = React.useState<FetchState<T>>({ status: 'idle' });

  const fetch_ = React.useCallback(() => {
    if (!url) return;
    setState({ status: 'loading' });

    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then(data => setState({ status: 'success', data, cachedAt: Date.now() }))
      .catch(error => {
        if (error.name !== 'AbortError')
          setState({ status: 'error', error: error as Error });
      });

    return () => controller.abort();
  }, [url]);

  React.useEffect(fetch_, [fetch_]);

  return { state, refetch: fetch_ };
}

// ─── useToggle — tuple with explicit return type ─────────────────────

function useToggle(initial = false): readonly [boolean, () => void] {
  const [state, setState] = React.useState(initial);
  const toggle = React.useCallback(() => setState(s => !s), []);
  return [state, toggle] as const;
}

const [isMenuOpen, toggleMenu] = useToggle();
// isMenuOpen: boolean
// toggleMenu: () => void

// ─── useForm — generic with complex return type interface ─────────────

interface OrderFormValues {
  orderNumber: string;
  amount: string;
  customerId: string;
}

function OrderForm() {
  const { values, errors, isValid, handleChange, handleSubmit } = useForm<OrderFormValues>(
    { orderNumber: '', amount: '', customerId: '' },
    (vals) => {
      const errs: Partial<Record<keyof OrderFormValues, string>> = {};
      if (!vals.orderNumber) errs.orderNumber = 'Required';
      if (isNaN(Number(vals.amount))) errs.amount = 'Must be a number';
      return errs;
    }
  );

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input value={values.orderNumber} onChange={handleChange('orderNumber')} />
      {errors.orderNumber && <span>{errors.orderNumber}</span>}
      <button type="submit" disabled={!isValid}>Submit</button>
    </form>
  );
}
```

---

## 🧠 6. Memory Aid

**Mental Model:** Tuple return → annotate or `as const`. Object return → inference fine. Generic hooks → state and callbacks use same `<T>`. Overloads → for conditionally different return shapes.

**If you go blank:** "Hooks returning arrays: TypeScript infers union array — fix with explicit tuple type or `as const`. Return objects for multiple values. Make hooks generic when callers have different types. Overload when different args → different return types."

**Mnemonic:** **TOGO: Tuple needs annotation, Object gets inference free, Generic flows T through, Overload for conditional returns**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Properly typed hooks give full IDE autocomplete at call sites — developers never need to inspect the hook implementation  
→ Performance: `useCallback` with typed parameters prevents unnecessary re-renders when hook-returned functions are passed as props  
→ Business: Domain hooks with typed interfaces decouple components from implementation details — swapping state management libraries doesn't break all consumers if the hook interface stays stable

**How it works (3 sentences):**
Custom hook return types follow standard TypeScript inference, except for tuple returns where TypeScript infers a union-typed array — requiring an explicit tuple type annotation or `as const` to preserve positional types. Generic hooks use type parameters to flow the caller's type through internal state and return values, giving full type inference from the hook's arguments to its return. Overloaded declarations let one hook name have multiple signatures — the most specific matching overload determines the return type at each call site.

**Company relevance:**
- Microsoft: Teams and Office use custom hooks as domain service boundaries — typed hook interfaces are architectural requirements
- Adobe: Spectrum hooks are the public API of the component library — every hook has a TypeScript interface declared separately from the implementation
- Salesforce: Lightning platform custom hooks for record adapters require generic typing to flow Apex entity types
- Cisco: Webex SDK React hooks expose participant, meeting, and media state — all typed with discriminated union return states

---
**✅ Topic 53/486 complete.**
**→ Continuing to Topic 54: Typing Context with Generic Providers**
