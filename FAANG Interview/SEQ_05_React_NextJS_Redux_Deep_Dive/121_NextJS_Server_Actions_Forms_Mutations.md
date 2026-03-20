# 121. Next.js Server Actions — Forms and Mutations
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Server Actions are async functions that run exclusively on the server but can be called directly from Client Components or HTML `<form>` elements — without writing a separate API route. Marked with `'use server'`, they let you perform database writes, mutations, and side effects (like revalidating cache) co-located with your UI code. The client sends a POST request under the hood (Next.js serializes the call via React's action protocol), but from the developer's perspective it looks like a direct function call. They are the App Router replacement for the old Pages Router `/api` mutation pattern, and they compose directly with React's `useActionState` and `useFormStatus` hooks for loading and error states.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Mechanics: How They Work

```
Client Component calls a Server Action → Next.js serializes arguments
→ POST request to the same URL with action ID in headers
→ Server receives, deserializes, runs the function in a server context
→ Returns serialized result + triggers RSC re-render or redirect
→ Client updates UI
```

Server Actions work in two forms:
1. **Inline in JSX** (Server Component) — function defined inline with `'use server'` directive inside
2. **Separate file** (shared) — file-level `'use server'` at the top; all exports are Server Actions, importable in Client Components

### Defining and Using Server Actions

```typescript
// ====== Method 1: Inline in a Server Component ======
// app/todos/page.tsx  (Server Component)
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export default async function TodosPage() {
  const todos = await db.todo.findMany();

  // Server Action defined inline — 'use server' inside function
  async function addTodo(formData: FormData) {
    'use server';
    const title = formData.get('title') as string;
    if (!title?.trim()) return;           // server-side validation
    await db.todo.create({ data: { title } });
    revalidatePath('/todos');             // invalidate Page cache
  }

  return (
    <div>
      {todos.map(todo => (
        <div key={todo.id}>{todo.title}</div>
      ))}
      {/* Native form: works without JS, progressively enhanced */}
      <form action={addTodo}>
        <input name="title" required minLength={1} maxLength={200} />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}

// ====== Method 2: Separate 'use server' file ======
// app/actions/todo-actions.ts
'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const TodoSchema = z.object({
  title: z.string().min(1).max(200).trim(),
});

export async function addTodo(formData: FormData) {
  // ① Auth check — ALWAYS verify on the server
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');  // or redirect('/login')

  // ② Input validation — ALWAYS validate server-side even with client validation
  const parsed = TodoSchema.safeParse({ title: formData.get('title') });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await db.todo.create({
    data: { title: parsed.data.title, userId: session.user.id },
  });

  revalidatePath('/todos');  // ③ Revalidate cache to show new data
  // Can also: redirect('/todos/success') — but this throws internally in Next.js
}

export async function deleteTodo(id: string) {
  'use server';
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  // ④ Ownership check — IDOR prevention
  const todo = await db.todo.findUnique({ where: { id } });
  if (todo?.userId !== session.user.id) throw new Error('Forbidden');

  await db.todo.delete({ where: { id } });
  revalidatePath('/todos');
}
```

### useActionState — Form Loading and Error States

```typescript
// app/components/AddTodoForm.tsx
'use client';

import { useActionState } from 'react';
import { addTodo } from '@/app/actions/todo-actions';

type ActionState = { error?: Record<string, string[]> } | null;

export default function AddTodoForm() {
  // useActionState: wraps action with state management
  // Parameters: (action, initialState)
  // Returns:    [state, formAction, isPending]
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    addTodo,
    null
  );

  return (
    <form action={formAction}>
      <input
        name="title"
        aria-invalid={!!state?.error?.title}
        aria-describedby="title-error"
        disabled={isPending}
      />
      {state?.error?.title && (
        <p id="title-error" role="alert">{state.error.title[0]}</p>
      )}
      <button type="submit" disabled={isPending} aria-busy={isPending}>
        {isPending ? 'Adding...' : 'Add Todo'}
      </button>
    </form>
  );
}

// Note: Server Action must return ActionState (not just void) to use useActionState
// Updated addTodo signature:
// export async function addTodo(prevState: ActionState, formData: FormData): Promise<ActionState>
```

### useFormStatus — Submit Button State

```typescript
// app/components/SubmitButton.tsx
'use client';

import { useFormStatus } from 'react-dom';

// useFormStatus: reads the status of the closest parent <form>
// MUST be a child component of the <form> — cannot be inside the same component as the form
export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

// Usage:
// <form action={serverAction}>
//   <input name="title" />
//   <SubmitButton label="Save" pendingLabel="Saving..." />  {/* ✅ child of form */}
// </form>
```

### Optimistic Updates with useOptimistic

```typescript
// app/components/TodoList.tsx
'use client';

import { useOptimistic, useActionState } from 'react';
import { addTodo } from '@/app/actions/todo-actions';
import type { Todo } from '@prisma/client';

export default function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  // Optimistically add to list before server confirms
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    initialTodos,
    (state, newTitle: string) => [
      ...state,
      { id: `optimistic-${Date.now()}`, title: newTitle, done: false, userId: '' } satisfies Todo,
    ]
  );

  const [, formAction, isPending] = useActionState(async (_: null, formData: FormData) => {
    const title = formData.get('title') as string;
    addOptimisticTodo(title);   // update UI immediately
    await addTodo(formData);    // server call — if fails, optimistic state reverts
    return null;
  }, null);

  return (
    <>
      {optimisticTodos.map(todo => (
        <div key={todo.id} style={{ opacity: todo.id.startsWith('optimistic') ? 0.5 : 1 }}>
          {todo.title}
          {todo.id.startsWith('optimistic') && ' (saving...)'}
        </div>
      ))}
      <form action={formAction}>
        <input name="title" />
        <button type="submit" disabled={isPending}>Add</button>
      </form>
    </>
  );
}
```

### Server Actions vs API Routes

```
Scenario                        | Server Action  | Route Handler (API)
--------------------------------|----------------|--------------------
Form submit                     | ✅ Preferred   | ✅ Works
In-page mutation (no nav)       | ✅ Preferred   | Possible
Auth-protected mutation         | ✅ Easy        | Requires auth middleware
Revalidate cache after write    | ✅ Built-in    | Works via revalidateTag()
External client (mobile app)    | ❌             | ✅ Required
Webhook receiver                | ❌             | ✅ Required
File upload                     | ✅ FormData    | ✅ Both work
Streaming response / SSE        | ❌             | ✅ Required
CSRF protection                 | ✅ Built-in    | Manual required
Co-locate with UI component     | ✅             | ❌ (separate file)
```

### Security Considerations

```typescript
// Server Actions are automatically:
// ✅ CSRF-protected: Next.js validates Origin header on Server Action requests
// ✅ Not accessible via GET: only POST requests with action ID trigger them
// ✅ Require matching Origin

// Your responsibility:
// 1. Authentication: check session on EVERY action — actions are HTTP endpoints
// 2. Authorization: verify OWNERSHIP (IDOR prevention)
// 3. Input validation: use Zod, validate ALL inputs
// 4. Rate limiting: add rate limiting for public mutation endpoints

// ⚠️ Common mistake: trusting hidden form fields or URL params for user ID
// The userId must ALWAYS come from the server-side session, never from FormData

async function deleteComment(formData: FormData) {
  'use server';
  const commentId = formData.get('commentId') as string;  // ✅ from form
  const session = await auth();
  
  // ❌ NEVER do this:
  // const userId = formData.get('userId');  // forged by attacker
  
  // ✅ Always get user identity from server session:
  const userId = session.user.id;
  
  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (comment?.authorId !== userId) {
    throw new Error('Forbidden');  // IDOR check
  }
  await db.comment.delete({ where: { id: commentId } });
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, migrating from a Pages Router API route pattern (`/api/save-draft`, `/api/publish`) to Server Actions reduced boilerplate by ~40%: the separate route files, manual `req.body` parsing, and `fetch('/api/...')` calls in the client were replaced with co-located server functions. The critical addition was Zod validation on every action parameter (replacing manual `if (!body.title)` checks) and explicit ownership verification after discovering a latent IDOR bug during review: the old code trusted a `userId` from the request body.

**At FAANG scale:**
- **Microsoft:** Azure dashboard settings panel — Server Actions for user preference saves with `revalidatePath('/settings')`, progressive enhancement (works without JS for accessibility scenarios)
- **Adobe:** Creative Cloud asset uploads — Server Actions with optimistic UI (thumbnail appears immediately while upload processes), `useOptimistic` for instant feedback
- **Salesforce:** CRM contact update forms — Server Actions with `useActionState` for field-level validation errors returned from the server, preventing optimistic writes on validation failure
- **Cisco:** Device configuration changes — Server Actions + `revalidateTag` to refresh device status immediately after config apply, with explicit error state returned for partial failures

---

## 💬 4. Interview Execution

### Sample Answer

> "Server Actions are async functions that run on the server and can be called directly from Client Components or form `action` attributes. Under the hood, they're POST endpoints automatically generated by Next.js — you get CSRF protection and proper serialization without writing any API route boilerplate.
>
> The main patterns I use: for forms, I assign the action directly to the `<form action={serverAction}` attribute — this gives progressive enhancement for free. For loading states I use `useActionState`, which wraps the action and gives me `isPending`, the current error/success state, and a wrapped form action. For submit button state inside a form, `useFormStatus` from `react-dom` reads the parent form's pending state.
>
> The non-negotiable security rules: always check `await auth()` at the top of every action — actions are real HTTP endpoints, so any unauthenticated user can POST to them. Always validate with Zod. Always verify ownership for resource mutations — never trust a userId from FormData. The userId must come from the server-side session, not the form submission.
>
> When I need an external client like a mobile app or webhook receiver, I still use Route Handlers — Server Actions aren't designed for cross-origin calls."

---

## 💻 5. Code Example

```typescript
// Complete Server Action with all production patterns
// app/actions/post-actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

const CreatePostSchema = z.object({
  title: z.string().min(3).max(120).trim(),
  body: z.string().min(10).max(50000),
  publish: z.boolean().optional(),
});

export type CreatePostState = {
  errors?: z.ZodIssue[];
  message?: string;
} | null;

export async function createPost(
  prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  // ① Auth
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // ② Validate
  const parsed = CreatePostSchema.safeParse({
    title: formData.get('title'),
    body: formData.get('body'),
    publish: formData.get('publish') === 'on',
  });
  if (!parsed.success) {
    return { errors: parsed.error.issues };
  }

  // ③ Mutate
  const post = await db.post.create({
    data: {
      ...parsed.data,
      authorId: session.user.id,  // from session, never from FormData
      status: parsed.data.publish ? 'PUBLISHED' : 'DRAFT',
    },
  });

  // ④ Invalidate cache
  revalidateTag('posts');
  revalidatePath('/blog');

  // ⑤ Redirect on success (throws internally — do not try/catch this)
  redirect(`/blog/${post.id}`);
}

// ---- Client Form Component ----
// app/blog/new/page.tsx (can be Server Component using Server Action inline)
// Or as a Client Component:

// app/components/CreatePostForm.tsx
'use client';

import { useActionState } from 'react';
import { createPost, type CreatePostState } from '@/app/actions/post-actions';

export function CreatePostForm() {
  const [state, formAction, isPending] = useActionState<CreatePostState, FormData>(
    createPost,
    null
  );

  const getFieldError = (field: string) =>
    state?.errors?.find(e => e.path[0] === field)?.message;

  return (
    <form action={formAction} noValidate>
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          aria-invalid={!!getFieldError('title')}
          aria-describedby={getFieldError('title') ? 'title-err' : undefined}
        />
        {getFieldError('title') && (
          <p id="title-err" role="alert" style={{ color: 'red' }}>
            {getFieldError('title')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="body">Body</label>
        <textarea id="body" name="body" rows={10} />
        {getFieldError('body') && (
          <p role="alert" style={{ color: 'red' }}>{getFieldError('body')}</p>
        )}
      </div>

      <label>
        <input type="checkbox" name="publish" /> Publish immediately
      </label>

      <button type="submit" disabled={isPending} aria-busy={isPending}>
        {isPending ? 'Saving...' : 'Create Post'}
      </button>
    </form>
  );
}
```

---

## 🧠 6. Memory Aid

**AVRI — the Server Action lifecycle**
- **A**uth first: always `await auth()` before any logic
- **V**alidate: Zod schema on all FormData inputs
- **R**evalidate: `revalidatePath` / `revalidateTag` after mutation
- **I**dentity from session: userId ALWAYS from server session, never FormData

**Hook mapping:**
- `useActionState` = form-level state (errors, pending, last result)
- `useFormStatus` = button-level pending (must be child of `<form>`)
- `useOptimistic` = immediate UI update before server confirms

**vs API Routes:** Server Actions for UI-driven mutations + progressive enhancement; API Routes for external consumers + webhooks + streaming.

**Mnemonic:** **AVRI** — Auth, Validate, Revalidate, Identity-from-session. Never skip any of the four.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Server Actions eliminate the n+1 boilerplate problem (1 form = 1 API route file + 1 fetch call + 1 handler + CSRF token management → 1 action function) — demonstrating this directly addresses the "how does App Router change form handling" question in senior interviews
→ The IDOR/auth security pattern is a differentiator: most candidates describe the API surface but miss the security implications (actions are real HTTP endpoints that any attacker can call with arbitrary payloads) — articulating `userId` must never come from FormData shows production security awareness
→ Progressive enhancement via `<form action={serverAction}>` is an accessibility + resilience story (form works without JavaScript) — relevant for Microsoft's accessibility focus and Cisco's enterprise reliability requirements

**How it works (2 sentences):**
When Next.js builds a Server Action, it assigns an opaque action ID (a hash of the file path + export name) and registers a server-side handler; at the client, calling the action (or submitting its form) triggers a POST request to the current URL with the action ID encoded in a `Next-Action` header and the arguments serialized as multipart form data — the server receives this, looks up the registered handler by ID, deserializes the arguments, and executes the function in a Node.js server context with full access to server-only APIs (`cookies()`, `headers()`, database clients).
After the action returns, Next.js automatically triggers RSC re-rendering for the current route (so any async Server Components that read from the database will refetch), or if `revalidatePath`/`revalidateTag` was called, it invalidates those cache entries and triggers background regeneration — meaning the developer never manually updates client-side state from a mutation; the RSC re-render handles it.

---
✅ Topic 121/486 complete → Continuing to Topic 122: Next.js Image and Font Optimization
