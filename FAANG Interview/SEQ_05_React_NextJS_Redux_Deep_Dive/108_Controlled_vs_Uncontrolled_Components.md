# 108. Controlled vs Uncontrolled Components
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Controlled and uncontrolled are two paradigms for managing form element state in React. In a **controlled component**, React state is the single source of truth — you set `value` and handle `onChange` to update state, which feeds back into `value`. The DOM lives in sync with React state. In an **uncontrolled component**, the DOM is the authority — you set `defaultValue` for the initial value and read the current value via `ref.current.value`. Controlled gives you precise, real-time control (live validation, dependent fields, format-as-you-type). Uncontrolled is simpler, performs better for large forms, and is how libraries like `react-hook-form` work internally — they avoid re-rendering on every keystroke by keeping values in refs, not state.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Controlled Component — Full Value Ownership

```typescript
// Controlled: React state IS the input's displayed value
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setEmail(val);
    // Live validation possible because React owns the value
    setEmailError(val.includes('@') ? '' : 'Invalid email');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login({ email, password });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}         // ← React owns displayed value
        onChange={handleEmailChange}  // ← required; without this, input is read-only
      />
      {emailError && <span role="alert">{emailError}</span>}
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button type="submit">Login</button>
    </form>
  );
}

// One re-render per keystroke — may be expensive for 50-field forms
```

### Uncontrolled Component — DOM Ownership

```typescript
// Uncontrolled: DOM holds the current value; ref reads it on demand
function LoginFormUncontrolled() {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = emailRef.current?.value ?? '';
    const password = passwordRef.current?.value ?? '';
    login({ email, password });
    // No re-renders during typing ← key performance difference
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        defaultValue=""   // ← sets initial value ONCE; does not update on state change
        ref={emailRef}
      />
      <input
        type="password"
        defaultValue=""
        ref={passwordRef}
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

### The Controlled/Uncontrolled Trap — Mixing Them

```typescript
// ❌ Switch from uncontrolled to controlled mid-render: React warning
function BadInput() {
  const [value, setValue] = useState<string | undefined>(undefined);
  // Start: value=undefined → uncontrolled (no value prop = uncontrolled)
  // After setState: value='hello' → controlled
  // React: "A component is changing an uncontrolled input to be controlled"

  return <input value={value} onChange={e => setValue(e.target.value)} />;
}

// ✅ Fix: initialize with empty string (not undefined/null)
function GoodInput() {
  const [value, setValue] = useState('');  // always start as controlled — empty string
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}

// The rule: undefined value = uncontrolled; any string (including '') = controlled
// null also triggers the warning — always initialize form state with ''
```

### Resetting Uncontrolled Inputs

```typescript
// Controlled reset: trivial
function ControlledForm() {
  const [value, setValue] = useState('');
  const reset = () => setValue('');  // just update state
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}

// Uncontrolled reset: use key prop to force remount
function UncontrolledForm() {
  const [key, setKey] = useState(0);
  const reset = () => setKey(k => k + 1);  // new key → React remounts input

  return (
    <form>
      <input key={key} defaultValue="" type="text" />
      <button type="button" onClick={reset}>Reset</button>
    </form>
  );
}

// Alternative: use form.reset() native API
function UncontrolledFormV2() {
  const formRef = useRef<HTMLFormElement>(null);
  const reset = () => formRef.current?.reset();

  return (
    <form ref={formRef}>
      <input defaultValue="" type="text" name="username" />
      <button type="button" onClick={reset}>Reset</button>
    </form>
  );
}
```

### react-hook-form — Uncontrolled Internally

```typescript
// react-hook-form registers inputs WITHOUT controlling them via state
// Internally uses refs and native browser form APIs — no re-renders per keystroke
import { useForm } from 'react-hook-form';

interface LoginData { email: string; password: string }

function LoginWithRHF() {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginData>({ mode: 'onBlur' });

  // register returns { ref, onChange, onBlur, name } — attaches to DOM but doesn't trigger re-render
  return (
    <form onSubmit={handleSubmit(data => login(data))}>
      <input
        type="email"
        {...register('email', {
          required: 'Email required',
          pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' }
        })}
      />
      {errors.email && <span role="alert">{errors.email.message}</span>}
      <input
        type="password"
        {...register('password', { required: 'Password required', minLength: 8 })}
      />
      <button type="submit">Login</button>
    </form>
  );
}
// Benchmark: 50-field form; react-hook-form: ~1 re-render on submit
//   vs fully controlled: ~50 re-renders per field × keystrokes = thousands per session
```

### File Inputs — Always Uncontrolled

```typescript
// File inputs MUST be uncontrolled — cannot set value programmatically for security
function FileUpload() {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (file) {
      upload(file);
    }
  }

  // NEVER: <input type="file" value={...} />
  // This would allow JS to set the file path — a security vulnerability
  return (
    <div>
      <input type="file" ref={fileRef} accept="image/*" />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}
```

### When to Use Which

| Scenario | Controlled | Uncontrolled |
|----------|-----------|--------------|
| Live validation per keystroke | ✅ | ❌ |
| Format-as-you-type (phone, credit card) | ✅ | ❌ |
| Dependent fields (select A → options B) | ✅ | ❌ |
| Disable submit until valid | ✅ | ❌ |
| Large forms (50+ fields) | ❌ (performance) | ✅ |
| Simple forms, submit only | ❌ (complex) | ✅ |
| File inputs | ❌ (security) | ✅ (required) |
| Integration with react-hook-form | ❌ | ✅ (internal) |

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the product configuration form had 60+ fields. Initially built as fully controlled, it caused significant lag on lower-end devices — every keystroke triggered 60-field re-renders (each field was connected to validating the whole form). Migration to `react-hook-form` (uncontrolled internally) reduced form re-renders from thousands to ~5 per submission, eliminating the perceived lag. Live validation via `mode: 'onBlur'` preserved the UX — just deferred to blur rather than keystroke.

**At FAANG scale:**
- **Microsoft:** PowerApps form builder uses controlled components for live formula validation (changes in one field affect others in the formula grid)
- **Adobe:** Acrobat web's PDF form editor needs precise character-level control — fully controlled inputs with custom formatters
- **Salesforce:** Sales Cloud opportunity forms are large (30+ fields); RHF with uncontrolled inputs for most fields, controlled for dependent picklists
- **Cisco:** Network device config forms use uncontrolled with native validation — most fields don't need live validation

---

## 💬 4. Interview Execution

### Sample Answer

> "Controlled components have React state as their single source of truth — you set `value` and handle `onChange`. Every keystroke updates state, which triggers a re-render. They're perfect for live validation, format-as-you-type, dependent fields, or any case where you need to react to input changes immediately.
>
> Uncontrolled components let the DOM hold the value — you set `defaultValue` for the initial value and read `ref.current.value` when you need it. No re-renders during typing. They're simpler to write for basic forms, and they're required for file inputs (you literally cannot set a file input's value in JavaScript for security reasons).
>
> The important thing to know: `react-hook-form` is uncontrolled internally. It uses refs and the native browser form APIs to track values without triggering React re-renders on every keystroke. That's why it benchmarks so much faster than a fully controlled form on large forms.
>
> The critical pitfall: don't mix them by starting with `value={undefined}` and later setting it to a string — React will warn that you're changing an uncontrolled to controlled input. Always initialize string state with `''` not `undefined`."

---

## 💻 5. Code Example

```typescript
// ========================
// Side-by-side: same checkout form, two approaches
// ========================

// Production-quality Controlled approach
// — Use when: live credit card formatting, dependent shipping/billing toggle
function ControlledCheckoutForm() {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [sameAddress, setSameAddress] = useState(true);
  const [shippingCity, setShippingCity] = useState('');

  // Format credit card number as user types
  function handleCardChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  }

  // Format MM/YY expiry
  function handleExpiryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    const formatted = raw.length > 2 ? `${raw.slice(0,2)}/${raw.slice(2)}` : raw;
    setExpiry(formatted);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitPayment({ cardNumber: cardNumber.replace(/\s/g, ''), expiry });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={cardNumber}
        onChange={handleCardChange}
        placeholder="1234 5678 9012 3456"
        aria-label="Card number"
      />
      <input
        type="text"
        value={expiry}
        onChange={handleExpiryChange}
        placeholder="MM/YY"
        aria-label="Expiry date"
      />
      <label>
        <input
          type="checkbox"
          checked={sameAddress}
          onChange={e => setSameAddress(e.target.checked)}
        />
        Billing same as shipping
      </label>
      {/* Dependent field: only shown when sameAddress is false */}
      {!sameAddress && (
        <input
          type="text"
          value={shippingCity}
          onChange={e => setShippingCity(e.target.value)}
          placeholder="Shipping city"
        />
      )}
      <button type="submit">Pay</button>
    </form>
  );
}

// Production-quality Uncontrolled approach (react-hook-form)
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const checkoutSchema = z.object({
  cardNumber: z.string().regex(/^\d{16}$/, 'Enter 16-digit card number'),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Use MM/YY format'),
  email: z.string().email('Valid email required'),
});
type CheckoutData = z.infer<typeof checkoutSchema>;

function UncontrolledCheckoutForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CheckoutData>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onBlur',  // validate on blur, not keystroke → no re-renders while typing
  });

  return (
    <form onSubmit={handleSubmit(data => submitPayment(data))}>
      <div>
        <input {...register('cardNumber')} placeholder="Card number" />
        {errors.cardNumber && <span role="alert">{errors.cardNumber.message}</span>}
      </div>
      <div>
        <input {...register('expiry')} placeholder="MM/YY" />
        {errors.expiry && <span role="alert">{errors.expiry.message}</span>}
      </div>
      <div>
        <input {...register('email')} type="email" placeholder="Email" />
        {errors.email && <span role="alert">{errors.email.message}</span>}
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Processing...' : 'Pay'}
      </button>
    </form>
  );
}

// Type stubs
declare function submitPayment(data: any): void;
declare function login(data: any): void;
declare function upload(file: File): void;
```

---

## 🧠 6. Memory Aid

**Mental model:**
- Controlled = **thermostat** you set exactly. React temperature = displayed temperature. You control every degree.
- Uncontrolled = **outdoor thermometer**. Nature (DOM) holds the temperature. You just read it when asked.

**The trap:** undefined → controlled switch → React warning. Always `useState('')` not `useState(undefined)`.

**File inputs:** always uncontrolled — no exceptions. Can't set a file path via JS (security model).

**react-hook-form:** uncontrolled internally — the reason it's fast.

**Mnemonic:** **CDRU** — **C**ontrolled for **D**ependent/live/format, **R**ef for simple/large, **U**ncontrolled always for file.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Performance: fully controlled large forms re-render on every keystroke — on 50+ field forms this creates noticeable lag; understanding uncontrolled is why you'd reach for react-hook-form
→ Interview depth: explaining FILE inputs must be uncontrolled (browser security model) signals awareness of browser platform constraints, not just React abstractions
→ Common bug: `value={undefined}` → `value="some string"` mid-lifecycle causes React's uncontrolled→controlled warning — a very common mistake in forms that receive default values from async API calls

**How it works (2 sentences):**
In controlled components, React maintains a `value` state variable and the DOM input syncs to it on every render — so the `onChange` handler's job is to call `setState`, which triggers a re-render, which sets the `value` attribute on the DOM element to the new state (a cycle React enforces).
In uncontrolled components, the browser's native form element holds the current value in its own internal DOM state, the `defaultValue` prop sets the initial value once at mount without subsequent interference from React, and your code reads the current value at any point by accessing `ref.current.value` — decoupling DOM mutations from React's render cycle entirely.

---
✅ Topic 108/486 complete → Continuing to Topic 109: Error Boundaries
