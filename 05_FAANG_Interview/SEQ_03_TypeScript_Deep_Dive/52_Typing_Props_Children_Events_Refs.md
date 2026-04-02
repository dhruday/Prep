# 52. Typing Props, Children, Events, Refs in React
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

In React with TypeScript, every component's props, children, events, and refs need explicit types to get full type safety. Props are typed as plain interfaces. Children are `React.ReactNode` for flexibility or `React.ReactElement` when only elements are allowed. Events use React's synthetic event types like `React.ChangeEvent<HTMLInputElement>`. Refs use `React.RefObject<T>` (from `useRef`) or `React.ForwardedRef<T>` (from `forwardRef`). Getting these right eliminates the most common React TypeScript errors in component libraries.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Props Typing

**Basic props interface — preferred approach:**
```typescript
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

function Button({ label, variant = 'primary', disabled, onClick }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
```

**`React.FC` vs plain function — the `React.FC` debate:**
```typescript
// ❌ Avoid React.FC / React.FunctionComponent
const Button: React.FC<ButtonProps> = ({ label }) => <button>{label}</button>;
// Problems: implicitly adds children?: ReactNode (even if you don't want children)
//           wraps return type as ReactElement | null (slightly wrong)
//           Extra boilerplate for no benefit

// ✅ Prefer plain function with typed props
function Button({ label }: ButtonProps): React.ReactElement {
  return <button>{label}</button>;
}
// OR — return type inferred from JSX:
function Button({ label }: ButtonProps) {
  return <button>{label}</button>;
}
```

### Children Typing

```typescript
// ReactNode — most permissive (null, string, element, array, fragment)
interface ContainerProps {
  children: React.ReactNode;
}

// ReactElement — only React elements (no strings, numbers, null)
interface ModalProps {
  children: React.ReactElement;
}

// Specific children patterns:
interface TabsProps {
  children: React.ReactElement<TabPanelProps> | React.ReactElement<TabPanelProps>[];
}

// Function as children (render prop)
interface ListProps<T> {
  items: T[];
  children: (item: T, index: number) => React.ReactNode;
}

// PropsWithChildren — adds children?: ReactNode to existing props
type ButtonWithChildrenProps = React.PropsWithChildren<ButtonProps>;
```

**`React.ReactNode` vs `React.ReactElement` vs `JSX.Element`:**
```
ReactNode = ReactElement | string | number | boolean | null | undefined | ReactFragment
          = everything renderable

ReactElement = { type, props, key } — actual React element from JSX or createElement()
             = more restrictive

JSX.Element = alias for React.ReactElement<any, any>
            = used internally by JSX transformer
            = avoid in public API; use ReactElement or ReactNode
```

### Event Typing

**Common synthetic event types:**
```typescript
// Input changes
function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
  console.log(e.target.value);   // string
  console.log(e.target.checked); // boolean (for checkboxes)
}

// Form submit
function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
  e.preventDefault();
}

// Mouse events
function handleClick(e: React.MouseEvent<HTMLButtonElement>): void {
  e.currentTarget; // HTMLButtonElement
}

// Keyboard events
function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
  if (e.key === 'Enter') { /* ... */ }
}

// Drag events
function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
  e.dataTransfer.getData('text/plain');
}

// Focus events
function handleFocus(e: React.FocusEvent<HTMLInputElement>): void {
  e.relatedTarget; // Element | null — the previously focused element
}

// Generic pattern when the element varies
type InputHandler = React.ChangeEventHandler<HTMLInputElement>;
// equivalent to: (event: React.ChangeEvent<HTMLInputElement>) => void
```

**Custom event handler prop typing:**
```typescript
interface InputProps {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>; // React's built-in type alias
  onEnter?: (value: string) => void; // custom event — not a DOM event
}
```

### Ref Typing

**`useRef` — two distinct use cases:**
```typescript
// 1. DOM ref — holds a DOM element
function TextInput() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Type: React.RefObject<HTMLInputElement>
  // .current: HTMLInputElement | null (null until component mounts)

  const focus = () => inputRef.current?.focus();

  return <input ref={inputRef} />;
}

// 2. Mutable container (not a DOM ref)
function Timer() {
  const intervalId = React.useRef<number | null>(null);
  // Type: React.MutableRefObject<number | null>
  // .current is mutable — use for timers, subscriptions, etc.

  React.useEffect(() => {
    intervalId.current = window.setInterval(() => {}, 1000);
    return () => {
      if (intervalId.current) clearInterval(intervalId.current);
    };
  }, []);
}
```

**`forwardRef` — forwarding refs to children:**
```typescript
interface InputProps {
  placeholder?: string;
  disabled?: boolean;
}

// forwardRef<RefType, PropsType>
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ placeholder, disabled }, ref) => (
    <input ref={ref} placeholder={placeholder} disabled={disabled} />
  )
);

Input.displayName = 'Input'; // Important for React DevTools

// Usage
function Form() {
  const ref = React.useRef<HTMLInputElement>(null);
  return <Input ref={ref} placeholder="Type here" />;
}
```

**`useImperativeHandle` — expose controlled API:**
```typescript
interface DialogHandle {
  open:  () => void;
  close: () => void;
}

interface DialogProps {
  title: string;
  children: React.ReactNode;
}

const Dialog = React.forwardRef<DialogHandle, DialogProps>(
  ({ title, children }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);

    React.useImperativeHandle(ref, () => ({
      open:  () => setIsOpen(true),
      close: () => setIsOpen(false),
    }));

    if (!isOpen) return null;
    return (
      <div role="dialog">
        <h2>{title}</h2>
        {children}
      </div>
    );
  }
);

// Usage
const dialogRef = React.useRef<DialogHandle>(null);
<Dialog ref={dialogRef} title="Confirm">...</Dialog>
dialogRef.current?.open();
```

### ⚠️ Anti-Patterns & Pitfalls

- **Using `React.FC` — adds implicit children** — before React 18, `FC` added `children?: ReactNode` implicitly. If your component is a leaf node, receiving children is a type mistake. Use plain functions.
- **Initializing DOM ref with a value** — `useRef<HTMLInputElement>(initialValue)` where initialValue is not `null` returns `MutableRefObject<T>` not `RefObject<T>`. DOM refs should always be initialized with `null`.
- **`ref.current!` non-null assertion** — common shortcut, but if used before mount, throws at runtime. Prefer optional chaining `ref.current?.focus()`.
- **Using `any` for event handlers** — `(e: any) => void` defeats the purpose. Use `React.ChangeEvent<HTMLInputElement>` or `React.MouseEvent<HTMLButtonElement>`.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
SAP Fiori form components at SAP Labs needed `forwardRef` for integration with SAP UI5's focus management system — the parent needed to imperatively focus the first invalid field. Using `React.forwardRef<HTMLInputElement, InputProps>` with `useImperativeHandle` exposed a `{ focus, validate }` API that matched SAP UI5's form API. At Bosch, the WebSocket status indicator was a complex component that needed both a DOM ref for animations and a mutable ref for the WebSocket instance — distinguishing `useRef<WebSocket | null>(null)` (mutable container) from `useRef<HTMLDivElement>(null)` (DOM ref) was critical for correct behavior.

**At FAANG scale:**
- **Microsoft:** Fluent UI component library uses `forwardRef` on every interactive component — ref forwarding is expected in all component libraries at Microsoft level
- **Adobe:** React Spectrum uses `useImperativeHandle` for dialog, overlay, and combobox components — custom handle APIs replace direct DOM manipulation
- **Salesforce:** LWC bridge to React requires typed refs at the component boundary — forwardRef typing is standard interview content
- **Cisco:** Collaboration SDK UI components expose imperative APIs (mute, unmute, share screen) via refs with custom handle types

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "For component props, I type as a plain interface and use destructuring — no `React.FC` because it adds implicit children and has no real benefit. For children, `ReactNode` for anything renderable, `ReactElement` when I only accept JSX elements. For events, I always use the full synthetic event type: `React.ChangeEvent<HTMLInputElement>` not `any` — `e.target.value` and `e.currentTarget` are then fully typed. For refs, I use `useRef<HTMLElement>(null)` for DOM refs (initialized with null) and `useRef<T>(initialValue)` for mutable containers like timers. For exposing components to parents, `forwardRef<RefType, PropsType>` with `useImperativeHandle` when I want to expose a controlled API rather than the raw DOM node."

### Likely Follow-up Questions
1. **Why avoid `React.FC`?** → It implicitly added `children?: ReactNode` (pre-React 18), wraps return in `ReactElement | null` which is slightly off, and adds no type-checking benefit over plain functions
2. **Difference between `RefObject` and `MutableRefObject`?** → `RefObject<T>` has `current: T | null` (read-only semantically — for DOM refs); `MutableRefObject<T>` has `current: T` (mutable — for instance variables). Initialized with `null` gives `RefObject`; initialized with a value gives `MutableRefObject`
3. **When do you use `forwardRef`?** → When a child component needs to expose its DOM node (or a custom imperative handle) to its parent — required for building reusable component libraries
4. **What is `useImperativeHandle`?** → Customizes what ref.current exposes when using forwardRef — lets you expose a controlled API instead of the raw DOM element

### How to Signal Senior Thinking
> "The `forwardRef` + `useImperativeHandle` combination is what separates library-quality components from app components. Instead of exposing the raw DOM node — which lets callers do anything — you expose a typed handle interface: `{ open, close, validate }`. This is the pattern React Spectrum uses for dialogs and Adobe's design system uses for modals. At SAP, exposing a `{ focusFirstError }` handle via `useImperativeHandle` integrated cleanly with SAP UI5's accessibility-driven focus management without leaking the DOM structure."

---

## 💻 5. Code Example

```typescript
// ─── Typed form input with forwardRef ────────────────────────────────

interface TextInputProps {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onEnter?: (value: string) => void;
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, value, placeholder, disabled, error, onChange, onEnter }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') onEnter?.(e.currentTarget.value);
    };

    return (
      <div className="field">
        <label>{label}</label>
        <input
          ref={ref}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          aria-invalid={!!error}
        />
        {error && <span className="error">{error}</span>}
      </div>
    );
  }
);
TextInput.displayName = 'TextInput';

// ─── Form with imperative handle ─────────────────────────────────────

interface FormHandle {
  focusFirstError: () => void;
  reset: () => void;
}

interface FormProps {
  onSubmit: (values: Record<string, string>) => void;
  children: React.ReactNode;
}

const Form = React.forwardRef<FormHandle, FormProps>(
  ({ onSubmit, children }, ref) => {
    const formRef = React.useRef<HTMLFormElement>(null);

    React.useImperativeHandle(ref, () => ({
      focusFirstError: () => {
        const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        invalid?.focus();
      },
      reset: () => formRef.current?.reset(),
    }));

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      onSubmit(Object.fromEntries(data) as Record<string, string>);
    };

    return (
      <form ref={formRef} onSubmit={handleSubmit}>
        {children}
      </form>
    );
  }
);

// ─── Usage ───────────────────────────────────────────────────────────

function OrderForm() {
  const formRef = React.useRef<FormHandle>(null);
  const [name, setName] = React.useState('');

  const handleError = () => {
    formRef.current?.focusFirstError(); // typed imperative call
  };

  return (
    <Form ref={formRef} onSubmit={handleError}>
      <TextInput
        label="Customer Name"
        value={name}
        onChange={(e) => setName(e.target.value)} // e: React.ChangeEvent<HTMLInputElement>
        onEnter={(val) => console.log('Entered:', val)}
      />
    </Form>
  );
}
```

---

## 🧠 6. Memory Aid

**Mental Model:** Props = interface. Children = ReactNode (anything) or ReactElement (JSX only). Events = synthetic event wrapper on the HTML element type. Refs = RefObject for DOM (init null), MutableRefObject for values (init value). forwardRef = expose to parent.

**If you go blank:** "Props: plain interface. Children: ReactNode. Events: React.ChangeEvent<HTMLInputElement>. Refs: useRef<Element>(null) for DOM, useRef<Value>(initialValue) for mutable. forwardRef<RefType, PropsType> when parent needs the ref."

**Mnemonic:** **PCER-F: Props, Children, Events, Refs, then Forward**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Typed events catch incorrect `.target.value` access (e.g., calling `.value` on `HTMLSelectElement` without checking type)  
→ Performance: Properly typed refs prevent expensive workarounds; direct DOM access via typed refs is faster than relying on React state for imperative operations  
→ Business: In component libraries, typed props and forwarded refs are the API contract — incorrect types mislead consumers and cause runtime errors

**How it works (3 sentences):**
React props are typed as plain TypeScript interfaces, destructured in the function signature. Synthetic event types (`React.ChangeEvent<T>`, `React.MouseEvent<T>`) wrap native DOM events and provide a typed `target` and `currentTarget` where T is the HTML element type. Refs created with `useRef<T>(null)` are `RefObject<T>` (DOM nodes), while `useRef<T>(value)` are `MutableRefObject<T>` (mutable instance variables); `forwardRef<RefType, PropsType>` lets parent components attach refs to child component DOM nodes or custom imperative handles.

**Company relevance:**
- Microsoft: Fluent UI is built on forwardRef with custom handles — Microsoft expects deep ref typing knowledge in frontend interviews
- Adobe: React Spectrum's accessibility model requires imperative focus management via refs — custom handles with `useImperativeHandle` is the pattern
- Salesforce: LWC bridge components expose imperative APIs via refs — typed handles prevent incorrect API surface exposure
- Cisco: Video SDK UI components (mute button, share button) use typed refs for programmatic control — expected to demonstrate forwardRef + useImperativeHandle pattern

---
**✅ Topic 52/486 complete.**
**→ Continuing to Topic 53: Typing Custom Hooks**
