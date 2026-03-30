# 291 – Discriminated Unions

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Discriminated unions (also called tagged unions) are union types where each member has a **common literal property** (the discriminant) that TypeScript uses for **automatic type narrowing**. The pattern: each union member has a `type`, `status`, or `kind` property with a unique literal value. When you check this property in a `switch` or `if`, TypeScript automatically narrows the type and gives you access to member-specific properties. This is the most important TypeScript pattern for state management.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### The Pattern

```typescript
// Discriminant: 'status' property with unique literal values
type ApiState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string; retryCount: number }
  | { status: 'success'; data: T; cachedAt: Date };

function render(state: ApiState<User[]>) {
  switch (state.status) {
    case 'idle':    return null;
    case 'loading': return <Spinner />;
    case 'error':   return <Error msg={state.error} retries={state.retryCount} />; // TS knows these exist
    case 'success': return <UserList users={state.data} cached={state.cachedAt} />;  // TS knows these exist
  }
}
```

### Exhaustiveness Checking

```typescript
// The never type ensures all cases are handled
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

function handleState(state: ApiState<User[]>) {
  switch (state.status) {
    case 'idle':    return 'idle';
    case 'loading': return 'loading';
    case 'error':   return 'error';
    case 'success': return 'success';
    default:        return assertNever(state); // compile error if a case is missing
  }
}
```

### Reducer Pattern (React useReducer)

```typescript
type CounterAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET'; payload: number }
  | { type: 'RESET' };

function counterReducer(state: number, action: CounterAction): number {
  switch (action.type) {
    case 'INCREMENT': return state + 1;
    case 'DECREMENT': return state - 1;
    case 'SET':       return action.payload; // TS knows payload exists
    case 'RESET':     return 0;
  }
}
```

### Why Not Just Use Interfaces?

```typescript
// ❌ Without discriminated union — impossible state
interface BadState { isLoading: boolean; error: string | null; data: User[] | null; }
// Problem: isLoading: true, error: "Network error", data: [user1] — impossible but allowed

// ✅ With discriminated union — impossible states are unrepresentable
type GoodState = { status: 'loading' } | { status: 'error'; error: string } | { status: 'success'; data: User[] };
// Can't be loading AND have data — TypeScript prevents it
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I refactored our OData loading states from boolean flags (`isLoading`, `hasError`, `data`) to discriminated unions. This eliminated 4 classes of state bugs where combinations like `isLoading: true, data: [...]` were possible but nonsensical.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"Discriminated unions use a common literal property for type-safe narrowing. I use them for: async state (loading/error/success), reducer actions, form field states, and API responses. The key benefit: impossible states become unrepresentable. Instead of `{ isLoading: boolean, error: string | null, data: T | null }` (3 booleans = 8 combinations, only 3 valid), I use a discriminated union with 3 members — TypeScript prevents invalid combinations at compile time."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Complete discriminated union usage in React
type FormState =
  | { step: 'input'; values: Partial<FormData> }
  | { step: 'review'; values: FormData }
  | { step: 'submitting'; values: FormData }
  | { step: 'success'; values: FormData; confirmationId: string }
  | { step: 'error'; values: FormData; error: string };

type FormAction =
  | { type: 'UPDATE_FIELD'; field: keyof FormData; value: string }
  | { type: 'SUBMIT' }
  | { type: 'SUCCESS'; confirmationId: string }
  | { type: 'ERROR'; error: string }
  | { type: 'RETRY' };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'UPDATE_FIELD':
      if (state.step !== 'input') return state;
      return { step: 'input', values: { ...state.values, [action.field]: action.value } };
    case 'SUBMIT':
      if (state.step !== 'review') return state;
      return { step: 'submitting', values: state.values };
    case 'SUCCESS':
      if (state.step !== 'submitting') return state;
      return { step: 'success', values: state.values, confirmationId: action.confirmationId };
    case 'ERROR':
      if (state.step !== 'submitting') return state;
      return { step: 'error', values: state.values, error: action.error };
    case 'RETRY':
      if (state.step !== 'error') return state;
      return { step: 'review', values: state.values };
  }
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Discriminated union = common literal property + switch narrowing + impossible states unrepresentable."** Discriminant: `status`, `type`, `kind`, `step`. Always use `assertNever` in default case for exhaustiveness. Replace boolean flags with unions to eliminate impossible states.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** The single most important TypeScript pattern for state management. Eliminates entire categories of bugs.
**How:** Common discriminant property, switch/if narrowing, exhaustiveness with `never`, replace boolean flags.
**Companies:** All four test this. Microsoft asks about discriminated unions directly. React/Redux patterns rely heavily on this.
