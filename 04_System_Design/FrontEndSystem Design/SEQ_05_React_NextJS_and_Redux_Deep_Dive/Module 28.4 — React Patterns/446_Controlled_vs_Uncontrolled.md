# 446 – Controlled vs Uncontrolled Components

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Controlled**: React state drives the input — `value` + `onChange`. Single source of truth. **Uncontrolled**: DOM owns the value — access via `ref`. Less code, but harder to validate/share. **Rule**: Use controlled for forms that need validation, dynamic behavior, or shared state. Uncontrolled for simple, isolated inputs.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── CONTROLLED COMPONENT ────
function ControlledForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name required';
    if (!email.includes('@')) newErrors.email = 'Invalid email';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      console.log({ name, email }); // exact state known
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}           // React controls value
        onChange={e => setName(e.target.value)}  // React updates value
      />
      {errors.name && <span>{errors.name}</span>}
      
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      {errors.email && <span>{errors.email}</span>}
      
      <button type="submit">Submit</button>
    </form>
  );
}

// ──── UNCONTROLLED COMPONENT ────
function UncontrolledForm() {
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameRef.current?.value;  // read from DOM
    const email = emailRef.current?.value;
    console.log({ name, email });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input ref={nameRef} defaultValue="" />  {/* defaultValue, not value */}
      <input ref={emailRef} defaultValue="" />
      <button type="submit">Submit</button>
    </form>
  );
}

// ──── HYBRID: Uncontrolled with FormData (React 19) ────
function ModernForm() {
  async function handleAction(formData: FormData) {
    'use server';
    const name = formData.get('name');
    const email = formData.get('email');
    // process on server
  }
  
  return (
    <form action={handleAction}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit">Submit</button>
    </form>
  );
}

// ──── WHEN TO USE WHICH ────
// Controlled:
//   ✅ Real-time validation
//   ✅ Conditional disabling
//   ✅ Dynamic form fields
//   ✅ Multiple components sharing value
//   ✅ Format input (phone, currency)

// Uncontrolled:
//   ✅ Simple forms (contact, search box)
//   ✅ File inputs (always uncontrolled)
//   ✅ Third-party DOM libraries
//   ✅ Performance (fewer re-renders)

// ──── FILE INPUT (always uncontrolled) ────
function FileUpload() {
  const fileRef = useRef<HTMLInputElement>(null);
  const handleUpload = () => {
    const file = fileRef.current?.files?.[0];
    if (file) uploadFile(file);
  };
  return <input type="file" ref={fileRef} onChange={handleUpload} />;
}
```

### Comparison
| Aspect | Controlled | Uncontrolled |
|---|---|---|
| Source of truth | React state | DOM |
| Re-renders | Every keystroke | None |
| Validation | Real-time | On submit |
| Boilerplate | More (state + handler) | Less (ref) |
| File input | ❌ | ✅ (always) |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Controlled: React state = source of truth (value + onChange). Uncontrolled: DOM owns value (ref + defaultValue). Use controlled for validation, shared state, formatting. Uncontrolled for simple forms, file inputs, performance. React 19 form actions blend both — FormData from uncontrolled inputs with server-side processing."*

## 4. 🧠 MEMORY AID
**"Controlled = value + onChange (React owns it). Uncontrolled = ref + defaultValue (DOM owns it). File inputs = always uncontrolled."**
