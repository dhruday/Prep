# 144. State Machines (XState) for Complex Flows
**Phase:** State & Data | **Sequence:** SEQ 06 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

State machines are a modeling paradigm where a system can be in exactly one of a finite set of states at any moment, and transitions between states are explicit and exhaustive. XState is the production-grade JavaScript/TypeScript library implementing finite state machines (FSM) and statecharts — adding hierarchy, parallelism, history, and delayed transitions. I use state machines for complex flows where a component can be in many possible states and must handle events differently depending on the current state: multi-step checkout, file upload with retry, authentication flows, modal wizards, drag-and-drop interactions. The core value is eliminating impossible state bugs — instead of `isLoading && isSuccess && hasError` boolean soup, the machine enforces that `loading` and `success` cannot coexist.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Why State Machines: The Boolean Soup Problem

```typescript
// ❌ Boolean soup — 8 booleans = 2^8 = 256 possible states, only 6 are valid
interface UploadState {
  idle: boolean;
  uploading: boolean;
  success: boolean;
  error: boolean;
  retrying: boolean;
  cancelled: boolean;
}

// Impossible states that can occur in practice:
// uploading: true AND success: true (upload finished but still showing spinner)
// error: true AND success: true (showed both error and success messages)
// idle: true AND uploading: true (ghost spinner on idle page)

// ✅ State machine — only 5 valid states, impossible states are structurally impossible
type UploadState = 'idle' | 'uploading' | 'success' | 'error' | 'retrying';
// Can only be ONE at a time — no combination bugs possible
```

### XState v5 — Core Concepts

```typescript
import { createMachine, assign, fromPromise } from 'xstate';
import { useMachine } from '@xstate/react';

interface UploadContext {
  file: File | null;
  progress: number;
  error: string | null;
  retryCount: number;
  uploadedUrl: string | null;
}

type UploadEvent =
  | { type: 'SELECT_FILE'; file: File }
  | { type: 'UPLOAD' }
  | { type: 'PROGRESS'; progress: number }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

const uploadMachine = createMachine({
  // TypeScript typing for context and events
  types: {} as {
    context: UploadContext;
    events: UploadEvent;
  },

  id: 'fileUpload',
  initial: 'idle',

  context: {
    file: null,
    progress: 0,
    error: null,
    retryCount: 0,
    uploadedUrl: null,
  },

  states: {
    idle: {
      on: {
        SELECT_FILE: {
          target: 'fileSelected',
          actions: assign({ file: ({ event }) => event.file }),
        },
      },
    },

    fileSelected: {
      on: {
        UPLOAD: 'uploading',
        RESET: {
          target: 'idle',
          actions: assign({ file: null }),
        },
      },
    },

    uploading: {
      invoke: {
        src: fromPromise(async ({ input }: { input: { file: File } }) => {
          const formData = new FormData();
          formData.append('file', input.file);
          const response = await fetch('/api/upload', { method: 'POST', body: formData });
          if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
          return response.json() as Promise<{ url: string }>;
        }),
        input: ({ context }) => ({ file: context.file! }),
        onDone: {
          target: 'success',
          actions: assign({
            uploadedUrl: ({ event }) => event.output.url,
            progress: 100,
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => (event.error as Error).message,
          }),
        },
      },
      on: {
        PROGRESS: {
          actions: assign({ progress: ({ event }) => event.progress }),
        },
        CANCEL: 'idle',
      },
    },

    error: {
      on: {
        RETRY: {
          target: 'uploading',
          guard: ({ context }) => context.retryCount < 3,  // guard — conditional transition
          actions: assign({
            retryCount: ({ context }) => context.retryCount + 1,
            error: null,
          }),
        },
        RESET: {
          target: 'idle',
          actions: assign({ file: null, error: null, retryCount: 0, progress: 0 }),
        },
      },
    },

    success: {
      type: 'final',  // terminal state — no further transitions
    },
  },
});
```

### Using a Machine in React

```typescript
import { useMachine } from '@xstate/react';

function FileUploader() {
  const [state, send] = useMachine(uploadMachine);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) send({ type: 'SELECT_FILE', file });
  };

  return (
    <div>
      {/* State-driven rendering — no boolean conditions */}
      {state.matches('idle') && (
        <input type="file" onChange={handleFileChange} />
      )}

      {state.matches('fileSelected') && (
        <div>
          <p>Selected: {state.context.file?.name}</p>
          <button onClick={() => send({ type: 'UPLOAD' })}>Upload</button>
          <button onClick={() => send({ type: 'RESET' })}>Cancel</button>
        </div>
      )}

      {state.matches('uploading') && (
        <div>
          <progress value={state.context.progress} max={100} />
          <p>{state.context.progress}% uploaded</p>
          <button onClick={() => send({ type: 'CANCEL' })}>Cancel</button>
        </div>
      )}

      {state.matches('error') && (
        <div role="alert">
          <p>Error: {state.context.error}</p>
          {state.context.retryCount < 3 && (
            <button onClick={() => send({ type: 'RETRY' })}>
              Retry ({3 - state.context.retryCount} attempts left)
            </button>
          )}
          <button onClick={() => send({ type: 'RESET' })}>Start over</button>
        </div>
      )}

      {state.matches('success') && (
        <div>
          <p>Uploaded successfully!</p>
          <a href={state.context.uploadedUrl!}>View file</a>
        </div>
      )}
    </div>
  );
}
```

### Hierarchical States (Statecharts)

```typescript
// Parallel states — two independent regions running simultaneously
const checkoutMachine = createMachine({
  id: 'checkout',
  type: 'parallel',  // all direct child states run in parallel
  states: {
    orderDetails: {
      initial: 'editing',
      states: {
        editing: { on: { CONFIRM_ORDER: 'confirmed' } },
        confirmed: { type: 'final' },
      },
    },
    payment: {
      initial: 'selectingMethod',
      states: {
        selectingMethod: {
          on: {
            SELECT_CARD: 'cardEntry',
            SELECT_PAYPAL: 'paypalRedirect',
          },
        },
        cardEntry: {
          on: { SUBMIT_CARD: 'processing' },
          // Nested state for card entry validation
          initial: 'pristine',
          states: {
            pristine: {},
            validating: {},
            valid: {},
            invalid: {},
          },
        },
        paypalRedirect: { /* ... */ },
        processing: { on: { PAYMENT_DONE: 'paid', PAYMENT_FAILED: 'failed' } },
        paid: { type: 'final' },
        failed: { on: { RETRY_PAYMENT: 'selectingMethod' } },
      },
    },
  },
  // Transition from parallel machine: both regions must reach final
  onDone: { target: 'complete' },
});
```

### Delayed Transitions (After)

```typescript
const toastMachine = createMachine({
  id: 'toast',
  initial: 'visible',
  context: { message: '', type: 'info' as 'info' | 'error' | 'success' },
  states: {
    visible: {
      after: {
        // Auto-dismiss after 3 seconds for info, 5 seconds for errors
        DISMISS_DELAY: 'dismissed',
      },
      on: {
        DISMISS: 'dismissed',
        HOVER: 'hovering',  // pause auto-dismiss on hover
      },
    },
    hovering: {
      on: { LEAVE: 'visible' },  // resume timer when mouse leaves
    },
    dismissed: { type: 'final' },
  },
}).provide({
  delays: {
    DISMISS_DELAY: ({ context }) => context.type === 'error' ? 5000 : 3000,
  },
});
```

### When to Use XState vs Simpler Solutions

| Complexity | Recommended |
|---|---|
| 2–3 boolean states, simple transitions | `useState` |
| 4–8 related states, multiple transitions | `useReducer` |
| 10+ states, parallel flows, async, guards | XState |
| Complex wizard with branching paths | XState |

**Use XState when:**
- Multi-step flows: checkout, onboarding, authentication wizards
- UI with complex async operations: file upload with progress/retry/cancel
- Document editors: editing → saving → saved → conflict
- Drag-and-drop: idle → hover → dragging → dropped → reverting
- WebSocket connection management: connecting → open → reconnecting → closed

### XState DevTools — Visualization

```typescript
// XState has first-class visualization at stately.ai/viz
// Copy the machine definition, paste into the visualizer:
// → See all states as nodes, all transitions as labeled edges
// → Send events interactively to watch state transitions
// → Export diagrams for documentation/PR reviews

// In development: use @xstate/inspect
import { inspect } from '@xstate/inspect';
if (process.env.NODE_ENV === 'development') {
  inspect({ iframe: false });  // opens in new tab
}
```

### Actor Model — Spawning Child Machines

```typescript
import { createMachine, assign, spawn } from 'xstate';

// Each upload item is its own actor — independent lifecycle
const uploaderListMachine = createMachine({
  context: { uploads: [] as any[] },
  on: {
    ADD_UPLOAD: {
      actions: assign({
        uploads: ({ context, event, spawn: spawnFn }) => [
          ...context.uploads,
          {
            file: event.file,
            ref: spawnFn(uploadMachine),  // spawn an independent upload machine
          },
        ],
      }),
    },
  },
});
```

### ⚠️ Anti-Patterns

- **State machines for simple boolean toggle** — overkill; cost: 5KB bundle, mental overhead
- **`state.matches('uploading')` deep in JSX of many files** — couple presentation to machine state string literals; use a selector helper `const isUploading = state.matches('uploading')`
- **Mutating context directly** — XState context is immutable; always use `assign` which returns a new state snapshot; direct mutation breaks time-travel debugging
- **Not using guards** — without `guard: condition` on transitions, adding conditional logic pollutes actions with `if` statements that obscure state logic

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the PO approval workflow had 7 boolean flags (`isSubmitting`, `isApproving`, `isRejecting`, `isPendingReview`, etc.) resulting in 4 production bugs where impossible states rendered conflicting UI. Migrated to XState with states `draft → submitted → pendingApproval → approved | rejected | requestedChanges → draft`. Impossible state bugs dropped to zero. The visual diagram generated from the machine definition became the approval workflow specification shared with the business analyst — replacing a 10-page Word document.

**FAANG scale:**
- **Microsoft:** Teams call control state machine — `idle → ringing → incall → muted|videoOff|screensharing → ending → idle`; parallel states for video, audio, screen share managed as independent parallel regions
- **Adobe:** InDesign Web's text tool — `select → textCursor → selectingText → editing → formatting` with nested states for each formatting mode; impossible to be in "editing text" and "selecting objects" simultaneously
- **Salesforce:** Quote approval flow XState machine visualized in Stately, used as the single source of truth for both FE behavior and business process documentation
- **Cisco:** WebRTC signaling state machine — `new → connecting → offer → answer → ICE → connected → disconnecting → closed`; reconnection handled as a nested machine spawned on `disconnected`

---

## 💬 4. Interview Execution

### Sample Answer

> "I reach for XState when I have more than about 8 distinct states with conditional transitions between them — the point where boolean flags start producing bugs from impossible states. The most compelling example I can give is SAP's purchase order approval flow: we had 7 boolean flags to model the approval lifecycle, and we'd hit bugs where `isApproving` and `isRejected` were true simultaneously because two async calls raced to update state. Modeling it as a state machine with `submitted → pendingApproval → approved | rejected` made those bugs structurally impossible.
>
> XState goes beyond simple FSMs with statecharts — you can have hierarchical states (nesting), parallel states (multiple independent regions), and delayed transitions. The parallel states feature is especially useful for checkout: order details and payment are independent flows that both need to reach their final states before the checkout machine marks itself complete.
>
> The visualization is underrated — you paste your machine code into Stately's visualizer and get a diagram you can share with product teams. At SAP it replaced a 10-page workflow specification document."

### Likely Follow-up Questions
1. "When would you NOT use XState?" → Simple boolean state (use useState), linear loading states (useQuery handles it), team unfamiliarity without time to learn (use useReducer as a lighter middle ground)
2. "What's the difference between `onDone` and `final` state?" → `type: 'final'` marks a state as terminal — when all parallel regions reach `final`, the parent machine's `onDone` fires
3. "How do guards work?" → Guards are predicates on transitions — `guard: ({ context }) => context.retryCount < 3`; without guards, transitions are unconditional
4. "How does XState integrate with React Query?" → XState handles the UI flow state machine (idle/loading/success/error transitions), React Query handles the data fetching; invoke React Query's `fetchQuery` inside XState's `invoke.src` service
5. "How do you test state machines?" → Pure function testing — `machine.transition(state, event)` returns the next state synchronously; no DOM, no async, no mocks needed; 100% statement coverage by enumerating state/event pairs

---

## 💻 5. Code Example

```typescript
// Multi-step onboarding wizard with XState v5

type OnboardingStep = 'profile' | 'preferences' | 'team' | 'complete';

interface OnboardingContext {
  userId: string;
  profile: { name: string; role: string } | null;
  preferences: { theme: string; notifications: boolean } | null;
  teamCode: string | null;
  error: string | null;
}

const onboardingMachine = createMachine({
  types: {} as { context: OnboardingContext },
  id: 'onboarding',
  initial: 'profile',
  context: { userId: '', profile: null, preferences: null, teamCode: null, error: null },
  states: {
    profile: {
      on: {
        SUBMIT_PROFILE: {
          target: 'savingProfile',
          actions: assign({ profile: ({ event }) => event.data }),
        },
      },
    },

    savingProfile: {
      invoke: {
        src: fromPromise(({ input }) => api.users.updateProfile(input.userId, input.profile)),
        input: ({ context }) => ({ userId: context.userId, profile: context.profile! }),
        onDone: 'preferences',
        onError: {
          target: 'profile',
          actions: assign({ error: ({ event }) => (event.error as Error).message }),
        },
      },
    },

    preferences: {
      on: {
        SUBMIT_PREFERENCES: {
          target: 'savingPreferences',
          actions: assign({ preferences: ({ event }) => event.data }),
        },
        BACK: 'profile',
      },
    },

    savingPreferences: {
      invoke: {
        src: fromPromise(({ input }) => api.users.savePreferences(input.userId, input.preferences)),
        input: ({ context }) => ({ userId: context.userId, preferences: context.preferences! }),
        onDone: 'team',
        onError: {
          target: 'preferences',
          actions: assign({ error: ({ event }) => (event.error as Error).message }),
        },
      },
    },

    team: {
      on: {
        SUBMIT_TEAM_CODE: {
          target: 'joiningTeam',
          actions: assign({ teamCode: ({ event }) => event.code }),
        },
        SKIP: 'complete',
        BACK: 'preferences',
      },
    },

    joiningTeam: {
      invoke: {
        src: fromPromise(({ input }) => api.teams.join(input.teamCode)),
        input: ({ context }) => ({ teamCode: context.teamCode! }),
        onDone: 'complete',
        onError: {
          target: 'team',
          actions: assign({ error: ({ event }) => (event.error as Error).message }),
        },
      },
    },

    complete: { type: 'final' },
  },
});

// Component — driven entirely by machine state
function OnboardingWizard({ userId }: { userId: string }) {
  const [state, send] = useMachine(onboardingMachine, {
    input: { userId },
  });

  const steps: OnboardingStep[] = ['profile', 'preferences', 'team', 'complete'];
  const currentStepIndex = steps.indexOf(state.value as OnboardingStep);

  return (
    <div>
      <StepIndicator steps={steps} current={currentStepIndex} />

      {state.context.error && (
        <div role="alert" className="error-banner">{state.context.error}</div>
      )}

      {(state.matches('profile') || state.matches('savingProfile')) && (
        <ProfileStep
          onSubmit={(data) => send({ type: 'SUBMIT_PROFILE', data })}
          isLoading={state.matches('savingProfile')}
        />
      )}

      {(state.matches('preferences') || state.matches('savingPreferences')) && (
        <PreferencesStep
          onSubmit={(data) => send({ type: 'SUBMIT_PREFERENCES', data })}
          onBack={() => send({ type: 'BACK' })}
          isLoading={state.matches('savingPreferences')}
        />
      )}

      {(state.matches('team') || state.matches('joiningTeam')) && (
        <TeamStep
          onSubmit={(code) => send({ type: 'SUBMIT_TEAM_CODE', code })}
          onSkip={() => send({ type: 'SKIP' })}
          onBack={() => send({ type: 'BACK' })}
          isLoading={state.matches('joiningTeam')}
        />
      )}

      {state.matches('complete') && <WelcomeScreen user={state.context.profile} />}
    </div>
  );
}
```

---

## 🧠 6. Memory Aid

**STAGE mnemonic — XState value props:**
- **S**tates are explicit and finite
- **T**ransitions are exhaustive and guarded
- **A**ctor model — machines can spawn child machines
- **G**raphable — visual diagrams from code
- **E**liminate impossible states structurally

**When to escalate from useState → useReducer → XState:**
- 1–3 states: `useState`
- 3–8 states with transitions: `useReducer`
- 8+ states OR async OR parallel OR guards: `XState`

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ The impossible states argument is the single strongest justification for state machines in interviews — 8 boolean flags = 256 combinations, only 6 valid, 250 bugs waiting to happen; a machine with 6 explicit states makes 250 of those structurally unrepresentable; this maps directly to the SAP PO approval example where the machine eliminated a class of production bugs entirely
→ Guards make business rules explicit and testable — conditional logic that lives in guards (`guard: ({ context }) => context.retryCount < 3`) is pure and unit-testable without DOM or React; the same condition buried in `onClick` handlers is tested only through integration tests
→ XState visualization turns code into living documentation — in enterprise teams (SAP, Microsoft, Salesforce), the XState diagram at stately.ai doubles as a specification document, eliminating the gap between business process diagrams and actual implemented logic

**How it works (2 sentences):**
XState implements the statechart formalism — a `createMachine` call builds an immutable description of states, events, transitions, and actions; when `useMachine` subscribes to a machine, it creates an Actor which holds the current state snapshot and processes events through the transition function (`machine.transition(state, event) → nextState`) producing new state snapshots that React re-renders from.
Async operations (`invoke`) integrate by wrapping promises or observables in Actors — on invocation XState creates an actor for the service, subscribes to its output, and when the actor resolves/rejects, fires the synthetic `xstate.done.actor.*` or `xstate.error.actor.*` event, transitioning via `onDone` or `onError` — meaning asynchronous effects are modeled as state transitions rather than side effects that modify state externally.

---
✅ Topic 144/486 complete → Continuing to Topic 145: URL as State — When and Why
