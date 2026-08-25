# 439 – Server Actions and useFormState / useActionState

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Server Actions** are async functions with `'use server'` that run on the server. Used as `<form action={...}>` handlers for mutations. **useActionState** (React 19, renamed from useFormState) manages form state + pending + error. Eliminates manual API calls for form submissions.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── SERVER ACTION — inline ────
async function createTodo(formData: FormData) {
  'use server';
  const title = formData.get('title') as string;
  await db.todo.create({ data: { title } });
  revalidatePath('/todos');
}

function TodoForm() {
  return (
    <form action={createTodo}>
      <input name="title" required />
      <button type="submit">Add Todo</button>
    </form>
  );
}

// ──── SERVER ACTION — separate file ────
// app/actions.ts
'use server';

export async function updateProfile(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  
  try {
    await db.user.update({
      where: { email },
      data: { name },
    });
    return { success: true, message: 'Profile updated!' };
  } catch (error) {
    return { success: false, message: 'Update failed' };
  }
}

// ──── useActionState (React 19) / useFormState ────
'use client';
import { useActionState } from 'react';
import { updateProfile } from './actions';

function ProfileForm() {
  const [state, formAction, isPending] = useActionState(updateProfile, {
    success: false,
    message: '',
  });
  
  return (
    <form action={formAction}>
      <input name="name" placeholder="Name" />
      <input name="email" placeholder="Email" />
      <button disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
      {state.message && (
        <p style={{ color: state.success ? 'green' : 'red' }}>
          {state.message}
        </p>
      )}
    </form>
  );
}

// ──── useFormStatus (pending state for submit buttons) ────
'use client';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}

// ──── PROGRESSIVE ENHANCEMENT ────
// Forms work even without JavaScript (basic HTML form submission)
// With JS: intercepted by React, run as Server Action
// Without JS: falls back to full-page form POST
```

### Server Actions vs API Routes
| Feature | Server Actions | API Routes |
|---|---|---|
| Defined with | `'use server'` | Route handler files |
| Called from | `<form action>` or direct call | fetch() |
| Validation | Inline | Middleware |
| Progressive enhancement | ✅ works without JS | ❌ requires JS |
| Revalidation | `revalidatePath`/`revalidateTag` | Manual |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Server Actions use 'use server' for mutations directly from forms. useActionState manages form state, pending, and errors. useFormStatus provides pending state for submit buttons. Progressive enhancement — forms work without JS. Eliminates manual fetch + useState + loading patterns."*

## 4. 🧠 MEMORY AID
**"Server Action = 'use server' + form action. useActionState = [state, formAction, isPending]. useFormStatus = { pending } inside form. Works without JS."**
