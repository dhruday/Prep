# 293 – Typing Props, Children, Events, Refs

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

React TypeScript typing covers four categories: **Props** (use `interface` for component contracts), **Children** (`React.ReactNode` for any renderable content), **Events** (`React.ChangeEvent<HTMLInputElement>` etc.), and **Refs** (`useRef<HTMLDivElement>(null)` with correct element type). Getting these right eliminates a huge class of runtime errors and shows TypeScript fluency in component development.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Props Typing

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

// With HTML element props forwarding
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

function Input({ label, error, ...rest }: InputProps) {
  return <div><label>{label}</label><input {...rest} />{error && <span>{error}</span>}</div>;
}
```

### Children Types

```typescript
React.ReactNode     // any renderable: string, number, JSX, null, undefined, array
React.ReactElement  // only JSX elements (no strings, no null)
React.PropsWithChildren<Props> // adds children?: ReactNode to your props
```

### Event Types

```typescript
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value);
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); };
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { /* ... */ };
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') submit(); };
const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => setFocused(true);
```

### Ref Types

```typescript
// DOM ref
const inputRef = useRef<HTMLInputElement>(null);
// inputRef.current?.focus(); // properly typed

// Mutable ref (no null)
const countRef = useRef<number>(0);
countRef.current = 5; // mutable

// forwardRef
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...rest }, ref) => <input ref={ref} {...rest} />
);
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, our React components used strict prop typing with interface inheritance from HTML attributes, ensuring all native HTML attributes were properly typed and forwarded.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"For React TypeScript: Props use interfaces with union types for variants. Children use React.ReactNode. Events use React.ChangeEvent<HTMLInputElement>, FormEvent, MouseEvent — generic with the HTML element type. Refs use useRef<HTMLDivElement>(null) for DOM refs and forwardRef for exposing refs to parents. I extend HTMLAttributes for components that wrap native elements, ensuring all native props are typed and forwarded."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Complete typed component
interface SelectProps<T> extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  getLabel: (item: T) => string;
  getValue: (item: T) => string;
}

const Select = React.forwardRef(<T,>(
  { options, value, onChange, getLabel, getValue, ...rest }: SelectProps<T>,
  ref: React.ForwardedRef<HTMLSelectElement>
) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = options.find(o => getValue(o) === e.target.value);
    if (selected) onChange(selected);
  };
  
  return (
    <select ref={ref} value={getValue(value)} onChange={handleChange} {...rest}>
      {options.map(opt => <option key={getValue(opt)} value={getValue(opt)}>{getLabel(opt)}</option>)}
    </select>
  );
});
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Props = interface. Children = ReactNode. Events = ChangeEvent<Element>. Refs = useRef<Element>(null)."** Extend HTMLAttributes for native element wrapping. forwardRef for exposable refs. Events are generic with the HTML element type.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** React + TypeScript is the standard. Proper typing eliminates runtime errors and shows fluency.
**How:** Interface for props, ReactNode for children, typed events, typed refs with forwardRef.
**Companies:** All four use React + TypeScript. Microsoft and Adobe test these patterns deeply.
