# 101. Server Actions — Forms, Mutations, Progressive Enhancement
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Server Actions are async functions marked with `"use server"` that run exclusively on the server and can be called directly from client components as if they were regular async functions — React and Next.js handle the HTTP transport layer transparently. They're the canonical mutation mechanism for the App Router: form submissions, button-triggered updates, data mutations. Server Actions enable **progressive enhancement** — a `<form action={serverAction}>` works without JavaScript (native HTML form submission) and degrades gracefully to a full-page post, then enhances with JavaScript for optimistic updates and no-reload experience. They give direct database access (via Prisma, Drizzle, etc.), can revalidate Next.js cache, and integrate with `useFormState`/`useFormStatus` for loading and error state management.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Defining Server Actions

```typescript
// Method 1: inline 'use server' in a Server Component
// app/products/actions.ts — dedicated actions file (best practice)
'use server';
// ← this directive at the top of the file marks ALL exports as Server Actions

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// Server Action — runs on server, accessible from client
export async function createProduct(prevState: ActionState, formData: FormData): Promise<ActionState> {
  // Validate input (always validate on server!)
  const raw = {
    name: formData.get('name'),
    price: formData.get('price'),
    category: formData.get('category'),
  };

  const schema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    price: z.coerce.number().positive('Price must be positive'),
    category: z.string().min(1, 'Category is required'),
  });

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
      message: 'Validation failed',
    };
  }

  // Direct DB access — no HTTP call
  try {
    await db.product.create({ data: result.data });
  } catch (error) {
    return { errors: {}, message: 'Database error. Failed to create product.' };
  }

  // Invalidate cached pages that show products
  revalidatePath('/products');
  // Optionally redirect
  redirect('/products');   // throws internally (NextRedirectError) — must be outside try/catch

  return { errors: {}, message: 'Product created successfully.' };
}

// State type for the action
interface ActionState {
  errors: Record<string, string[] | undefined>;
  message: string;
}
```

### Using Server Actions in Forms — Progressive Enhancement

```typescript
// app/products/new/page.tsx — Server Component, uses action directly
import { createProduct } from '../actions';

// Progressive Enhancement: this form works without JavaScript
// Native HTML form → POST to server → server action runs → redirect
export default function NewProductPage() {
  return (
    <form action={createProduct}>
      {/* Native HTML form submission supported */}
      <label>
        Name: <input name="name" type="text" required />
      </label>
      <label>
        Price: <input name="price" type="number" step="0.01" required />
      </label>
      <label>
        Category: <input name="category" type="text" required />
      </label>
      <button type="submit">Create Product</button>
    </form>
  );
  // Works with JS disabled: browser POSTs form → server action runs → redirect
  // Works with JS enabled: React intercepts submit, calls action via fetch, revalidates
}
```

### `useFormState` / `useActionState` — Error and Status Feedback

```typescript
'use client';
// Next.js 14+ uses useFormState; React 19 / Next.js 15 uses useActionState
// useActionState is the canary/React 19 version with better ergonomics
import { useActionState } from 'react';  // React 19
// OR: import { useFormState } from 'react-dom';  // Next.js 14

import { createProduct } from '../actions';

interface ActionState {
  errors: Record<string, string[] | undefined>;
  message: string;
}

const initialState: ActionState = { errors: {}, message: '' };

export function CreateProductForm() {
  const [state, formAction, isPending] = useActionState(createProduct, initialState);
  // state: current ActionState returned from the server action
  // formAction: bind this to form's action prop
  // isPending: true while action is in flight (React 19 useActionState includes this)

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" />
        {state.errors.name && (
          <span role="alert" style={{ color: 'red' }}>
            {state.errors.name.join(', ')}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="price">Price</label>
        <input id="price" name="price" type="number" step="0.01" />
        {state.errors.price && (
          <span role="alert" style={{ color: 'red' }}>
            {state.errors.price.join(', ')}
          </span>
        )}
      </div>

      <SubmitButton />

      {state.message && (
        <p role="status">{state.message}</p>
      )}
    </form>
  );
}
```

### `useFormStatus` — Submit Button Loading State

```typescript
'use client';
import { useFormStatus } from 'react-dom';

// Must be rendered INSIDE the form to access its status
function SubmitButton() {
  const { pending } = useFormStatus();
  // pending: true while the parent form's action is in flight

  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Creating...' : 'Create Product'}
    </button>
  );
  // ← SubmitButton MUST be a child element of the <form> to read its status
  // It cannot be the form itself or outside the form
}
```

### Calling Server Actions Programmatically

```typescript
'use client';
import { createProduct } from '../actions';
import { startTransition } from 'react';

function ProgrammaticTrigger() {
  async function handleClick() {
    // Server action called directly — not via form
    const formData = new FormData();
    formData.set('name', 'New Widget');
    formData.set('price', '29.99');
    formData.set('category', 'tools');

    const result = await createProduct({ errors: {}, message: '' }, formData);
    if (result.message === 'Product created successfully.') {
      // Handle success
    }
  }

  // For mutations that affect the rendered UI, wrap in startTransition
  const handleOptimistic = () => {
    startTransition(async () => {
      await createProduct({ errors: {}, message: '' }, formData);
    });
  };

  return <button onClick={handleClick}>Create Product</button>;
}
```

### Security — The Most Critical Aspect

```typescript
// NEVER trust client-passed data — always validate server-side
'use server';

export async function deleteProduct(productId: string) {
  // ❌ BAD: trusting that the caller is authorized
  await db.product.delete({ where: { id: productId } });

  // ✅ Always check authorization server-side
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  // Check that the product belongs to this user
  const product = await db.product.findUnique({ where: { id: productId } });
  if (product?.ownerId !== session.user.id) {
    throw new Error('Not authorized to delete this product');
  }

  await db.product.delete({ where: { id: productId } });
  revalidatePath('/products');
}
```

```typescript
// Server actions are POST endpoints — protect against CSRF
// Next.js does this automatically for same-origin requests
// For cross-origin requests, implement CSRF tokens or Origin header validation
```

### Optimistic Updates with `useOptimistic`

```typescript
'use client';
import { useOptimistic, startTransition } from 'react';
import { toggleLike } from './actions';

interface Product { id: string; liked: boolean; likeCount: number; }

function LikeButton({ product }: { product: Product }) {
  const [optimisticProduct, updateOptimistic] = useOptimistic(
    product,
    // How to apply the optimistic update (purely in-memory, no network)
    (state: Product, optimisticValue: boolean) => ({
      ...state,
      liked: optimisticValue,
      likeCount: state.likeCount + (optimisticValue ? 1 : -1),
    })
  );

  const handleLike = () => {
    startTransition(async () => {
      updateOptimistic(!product.liked);  // instant UI update
      // Server action runs in the background
      await toggleLike(product.id);
      // If server action fails, useOptimistic reverts to actual value automatically
    });
  };

  return (
    <button onClick={handleLike}>
      {optimisticProduct.liked ? '❤️' : '🤍'} {optimisticProduct.likeCount}
    </button>
  );
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, order entry forms were previously client-side fetch requests to REST APIs with manual error handling, loading states, and optimistic updates all hand-coded. Migrating to Server Actions (in a Next.js App Router upgrade) reduced the order creation form from ~150 lines (form + fetch + error + state management) to ~60 lines (form + useActionState). Validation moved server-side (eliminating duplicate validation), and `revalidatePath('/orders')` replaced manual cache invalidation.

**At FAANG scale:**
- **Microsoft:** Internal form-heavy admin tools use Server Actions for CRUD operations; progressive enhancement ensures forms work for users with slow JS loading or JS-disabled enterprise setups
- **Adobe:** Asset management workflows (rename, move, tag) use Server Actions for mutations; optimistic UI with `useOptimistic` makes operations feel instant while server synchronizes
- **Salesforce:** Record update forms use Server Actions; validation logic (field-level rules, relationship checks) stays server-side with direct Salesforce API access, results presented via `useActionState` error state
- **Cisco:** Device configuration push forms use Server Actions; the action calls Cisco's network management APIs, `revalidatePath` refreshes the device status page after successful config push

---

## 💬 4. Interview Execution

### Sample Answer

> "Server Actions are `async` functions marked with `'use server'` that run on the server. They're the primary mutation pathway in Next.js App Router — instead of writing an API route and a client-side fetch, you write the mutation function directly, calling the database, and the framework handles the HTTP transport.
>
> The progressive enhancement story is important: a `<form action={serverAction}>` submits natively without JavaScript via an HTML POST, and enhances with React to prevent full-page navigation when JavaScript is available. This is how web fundamentals and modern React coexist.
>
> For feedback: `useActionState` (React 19) or `useFormState` (React DOM) binds the action's return value to component state — you return validation errors from the action and display them without extra state management. `useFormStatus` in a child button component gives `pending: true` while the form is submitting.
>
> Security is critical: Server Actions are effectively POST endpoints. Always authenticate, always authorize (check that the user owns the resource), always validate on the server — client-passed IDs and data must never be trusted. I'd use `server-only` on the database client and Zod schema validation at the top of every Server Action."

### Likely Follow-ups

1. **How are Server Actions different from API Routes?** → The mechanics: Server Actions are encrypted function references sent as POST bodies; API Routes are explicit URL endpoints. The developer experience: Server Actions can be imported directly by components (no manual fetch, no URL string handling); API Routes require a manual `fetch('/api/...')`. Use Server Actions for form submissions and mutations in App Router; use Route Handlers (API Routes) when you need a public API endpoint callable by third parties or mobile apps.
2. **Can Server Actions be called from Client Components?** → Yes — you import the server action and call it as an async function from a client component. React and Next.js handle the serialization (form data → POST body) and deserialization (response → return value) transparently. The client component doesn't ship the action's code — it only calls the action's network endpoint.
3. **What happens on server action error?** → If the action throws an error (not caught inside the action), Next.js renders the nearest `error.tsx` boundary. If the action returns an error object (structured error handling pattern), the `useActionState` state is updated with the returned value, enabling inline form errors without a page-level error boundary.
4. **Are Server Actions secure against CSRF?** → Next.js 14+ Server Actions include built-in CSRF protection for same-origin requests. Next.js validates the Origin header against the host. For custom implementations over multiple origins or embedded contexts, you'd implement additional token-based CSRF protection. You should also validate every input on the server side (never trust formData values).

---

## 💻 5. Code Example

```typescript
// Full example: product form with Server Action, validation, optimistic update

// ========================
// actions/products.ts
// ========================
'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

export interface ProductActionState {
  success: boolean;
  errors: {
    name?: string[];
    price?: string[];
    category?: string[];
    general?: string[];
  };
}

const productSchema = z.object({
  name: z.string().min(1, 'Required').max(100, 'Max 100 chars'),
  price: z.coerce.number({ invalid_type_error: 'Must be a number' }).positive('Must be positive'),
  category: z.string().min(1, 'Required'),
});

export async function createProduct(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  // 1. Authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, errors: { general: ['Not authenticated'] } };
  }

  // 2. Validation
  const parsed = productSchema.safeParse({
    name: formData.get('name'),
    price: formData.get('price'),
    category: formData.get('category'),
  });

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  // 3. Mutation
  try {
    await db.product.create({
      data: { ...parsed.data, ownerId: session.user.id },
    });
  } catch {
    return { success: false, errors: { general: ['Failed to create product. Try again.'] } };
  }

  // 4. Cache invalidation
  revalidatePath('/products');
  return { success: true, errors: {} };
}

export async function deleteProduct(productId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Not authenticated');

  const product = await db.product.findUnique({ where: { id: productId } });
  if (product?.ownerId !== session.user.id) throw new Error('Unauthorized');

  await db.product.delete({ where: { id: productId } });
  revalidatePath('/products');
}

// ========================
// components/CreateProductForm.tsx (Client Component)
// ========================
'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createProduct, type ProductActionState } from '@/actions/products';

const initialState: ProductActionState = { success: false, errors: {} };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Creating…' : 'Create Product'}
    </button>
  );
}

export function CreateProductForm() {
  const [state, formAction] = useActionState(createProduct, initialState);

  if (state.success) {
    return <p role="status">✅ Product created!</p>;
  }

  return (
    <form action={formAction} noValidate>
      {state.errors.general && (
        <p role="alert" style={{ color: 'red' }}>
          {state.errors.general.join(', ')}
        </p>
      )}

      <div>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" aria-describedby={state.errors.name ? 'name-error' : undefined} />
        {state.errors.name && (
          <span id="name-error" role="alert">{state.errors.name.join(', ')}</span>
        )}
      </div>

      <div>
        <label htmlFor="price">Price ($)</label>
        <input id="price" name="price" type="number" step="0.01" min="0" />
        {state.errors.price && (
          <span role="alert">{state.errors.price.join(', ')}</span>
        )}
      </div>

      <div>
        <label htmlFor="category">Category</label>
        <input id="category" name="category" type="text" />
        {state.errors.category && (
          <span role="alert">{state.errors.category.join(', ')}</span>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}

// ========================
// Optimistic liked items list
// ========================
'use client';

import { useOptimistic, startTransition } from 'react';
import { toggleLike } from '@/actions/likes';

interface ListItem { id: string; name: string; liked: boolean; }

export function LikeableList({ items }: { items: ListItem[] }) {
  const [optimisticItems, setOptimisticItem] = useOptimistic(
    items,
    (state: ListItem[], { id, liked }: { id: string; liked: boolean }) =>
      state.map(item => item.id === id ? { ...item, liked } : item)
  );

  const handleToggle = (item: ListItem) => {
    startTransition(async () => {
      setOptimisticItem({ id: item.id, liked: !item.liked });  // instant UI
      await toggleLike(item.id);                               // server sync
    });
  };

  return (
    <ul>
      {optimisticItems.map(item => (
        <li key={item.id}>
          {item.name}
          <button onClick={() => handleToggle(item)}>
            {item.liked ? '❤️' : '🤍'}
          </button>
        </li>
      ))}
    </ul>
  );
}

// Required type stubs
declare module 'next-auth' { const getServerSession: (opts: unknown) => Promise<{user: {id: string}} | null>; export { getServerSession }; }
declare const authOptions: unknown;
```

---

## 🧠 6. Memory Aid

**Server Action = function on server, called by client, transport handled by React.**

The three hooks for Server Actions:
1. `useActionState(action, initialState)` → `[state, formAction, isPending]`
2. `useFormStatus()` → `{ pending }` — inside form children only
3. `useOptimistic(state, updaterFn)` → `[optimisticState, applyOptimistic]`

**Security checklist for every Server Action:**
1. Authenticate (is there a session?)
2. Authorize (does the user own this resource?)
3. Validate (is the data schema-valid on the server?)

**Mnemonic:** **PAVE** — **P**rogressive enhancement, **A**uthorize server-side, **V**alidate schema, **E**rrors returned via useActionState.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Modern React mutations: Server Actions are the App Router's answer to REST API calls for mutations — less boilerplate, built-in progressive enhancement, direct DB access
→ Security model: the `"use server"` + authorization + validation pattern establishes a clear, enforceable security boundary — more structured than ad-hoc API routes
→ DX gain: eliminating the API route / fetch / error-handling boilerplate for common mutations is a significant developer productivity improvement

**How it works (3 sentences):**
At build time, Next.js compiles Server Action functions into unique opaque references (encrypted action IDs); when a client component calls a server action or a form uses it as its `action` prop, the client runtime makes a POST request to a Next.js route handler that maps the action ID to the actual function and executes it on the server.
`useActionState` wraps this cycle by binding the action's Promise to React state — the component re-renders with the action's return value as the new state after each invocation, enabling server-returned validation errors to appear inline without manual client-side state management.
`useOptimistic` + `startTransition` wraps server actions for instant UI feedback: the optimistic updater is applied synchronously in the current render, the action's Promise runs concurrently, and if the action fails, React reverts the component to the source-of-truth value (the non-optimistic `state` argument).

**Company relevance:**
- Microsoft: Internal tools and forms (ticket creation, user management) powered by Server Actions; progressive enhancement critical for enterprise environments
- Adobe: Asset management operations — batch tag, move, archive — use Server Actions with optimistic updates for responsive UI under high-latency enterprise network conditions
- Salesforce: Record mutations (create lead, update opportunity) use Server Actions wrapping Salesforce API calls server-side, with Zod validation keeping validation logic co-located with the mutation
- Cisco: Network configuration push workflows use Server Actions for configuration mutation → device API call → revalidatePath cache refresh cycle

---
✅ Topic 101/486 complete → Continuing to Topic 102: React Compiler (React 19) — Auto-Memoisation
