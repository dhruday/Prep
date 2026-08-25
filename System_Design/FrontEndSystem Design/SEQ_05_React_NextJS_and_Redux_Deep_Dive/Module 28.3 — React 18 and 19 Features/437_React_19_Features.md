# 437 – React 19 Features — use(), Server Components, Actions, Compiler

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
React 19 introduces: **`use()` hook** (read Promise/Context in render), **Server Components** (default), **Server Actions** (form mutations), **React Compiler** (auto-memoization — no more useMemo/useCallback), **`<form>` actions**, **useFormStatus**, **useOptimistic**, **ref as prop** (no forwardRef).

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── use() HOOK — read Promises and Context ────
// Can be called conditionally (unlike other hooks!)
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // suspends until resolved
  return <h1>{user.name}</h1>;
}

// Read context with use() — can be conditional
function Theme({ show }: { show: boolean }) {
  if (show) {
    const theme = use(ThemeContext); // ✅ conditional use()
    return <div className={theme}>Themed</div>;
  }
  return null;
}

// ──── SERVER COMPONENTS (default in React 19) ────
// async component — runs on server only
async function ProductPage({ id }: { id: string }) {
  const product = await db.product.findById(id); // direct DB access!
  return (
    <div>
      <h1>{product.name}</h1>
      <AddToCart productId={id} /> {/* Client Component */}
    </div>
  );
}

// Client component — opt in with 'use client'
'use client';
function AddToCart({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);
  return <button onClick={() => setAdded(true)}>
    {added ? 'Added' : 'Add to Cart'}
  </button>;
}

// ──── SERVER ACTIONS ────
// 'use server' directive for server-side mutations
async function addToCart(formData: FormData) {
  'use server';
  const productId = formData.get('productId');
  await db.cart.add(productId);
}

function CartForm({ productId }: { productId: string }) {
  return (
    <form action={addToCart}>
      <input type="hidden" name="productId" value={productId} />
      <SubmitButton />
    </form>
  );
}

// ──── useFormStatus ────
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Adding...' : 'Add'}</button>;
}

// ──── useOptimistic ────
function Messages({ messages }: { messages: Message[] }) {
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (state, newMessage: string) => [...state, { text: newMessage, pending: true }],
  );
  
  async function send(formData: FormData) {
    const msg = formData.get('message') as string;
    addOptimistic(msg); // show immediately
    await sendMessage(msg); // server action
  }
  
  return (
    <form action={send}>
      {optimisticMessages.map(m => <p style={{ opacity: m.pending ? 0.5 : 1 }}>{m.text}</p>)}
      <input name="message" />
    </form>
  );
}

// ──── REACT COMPILER (auto-memoization) ────
// No more manual useMemo/useCallback!
// The compiler automatically inserts memoization at build time
function TodoList({ todos, filter }) {
  const filtered = todos.filter(t => t.status === filter);
  // Compiler auto-memoizes: equivalent to useMemo(() => ..., [todos, filter])
  return filtered.map(t => <TodoItem key={t.id} todo={t} />);
}

// ──── ref as prop (no forwardRef needed) ────
function Input({ ref, ...props }: { ref: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"React 19: use() reads Promises/Context (can be conditional). Server Components run on server for zero-JS rendering. Server Actions handle form mutations. React Compiler eliminates manual useMemo/useCallback. useFormStatus for pending states, useOptimistic for optimistic UI."*

## 4. 🧠 MEMORY AID
**"React 19 = use() + Server Components + Server Actions + Compiler (auto-memo) + useFormStatus + useOptimistic + ref as prop (no forwardRef)."**
