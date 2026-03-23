# 76. XState — State Machines in Frontend

## 1. High-Level Explanation

XState is a JavaScript library for building finite state machines (FSMs) and statecharts. Instead of managing a collection of boolean flags and ad-hoc conditionals, XState models UI as a set of explicit states with defined transitions. Every possible state of a component is declared, making impossible states impossible — a powerful concept for complex UI flows.

A state machine defines: **states** (what is the current status?), **events** (what triggered the change?), and **transitions** (given a state + event → what is the next state?). Statecharts extend FSMs with hierarchical states, parallel states, history states, and guards/actions.

---

## 2. Deep-Dive

### Core Concepts
- **Finite states**: `idle`, `loading`, `success`, `error` — not boolean soup
- **Transitions**: `{ on: { SUBMIT: 'loading' } }` — explicit, testable
- **Context**: extended state data (e.g., user object, error message)
- **Guards**: conditional transitions — `{ guard: 'isValid', target: 'submitted' }`
- **Actions**: side effects on entry/exit/transition (logging, fetching)
- **Services/Actors**: async invocations (promises, callbacks, observables)

### Why FSMs over useState?
```
// Boolean soup — hard to reason about
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
// isLoading=true AND isError=true simultaneously? Bug.
```

With a state machine, `loading` and `error` are mutually exclusive by definition.

### XState v5 (Actor Model)
XState v5 introduced the Actor Model — every machine is an actor that communicates through events. Actors can spawn child actors, creating a composable system for concurrent state.

---

## 3. Real-World Examples at SAP

At SAP Labs, Hruday evaluated XState for the order checkout wizard — a 5-step flow (cart → address → payment → review → confirm) with complex guard logic (stock check, address validation, payment processing). Traditional `useState` produced a 200-line component with nested conditionals. XState modelled the same flow in a 60-line machine definition, visualisable in XState Viz.

SAP Fiori's upload wizard (multi-step file upload with error recovery and retry) is a natural FSM use-case — idle → selecting → uploading → success/error → (retry → uploading).

---

## 4. Interview-Oriented Answer (STAR)

**S** — At SAP, we had a payment processing UI with complex state: idle, validating card, processing payment, awaiting 3DS auth, success, failed, retryable. Seven states — managed with `useState` booleans, leading to bugs where `isValidating && isError` could be simultaneously true.

**T** — I was asked to refactor this to be reliable and testable.

**A** — I modelled the payment flow as an XState machine with 7 explicit states, 12 transitions, and 3 guards (`canRetry`, `requires3DS`, `isAmountValid`). The machine was tested with `@xstate/test` by specifying state coverage paths. UI components became pure functions of `state.value`.

**R** — Zero impossible state bugs post-migration. Test coverage went from 40% → 92% for the payment flow. New engineers could see the entire flow in XState Viz in 5 minutes.

---

## 5. Code Example (TypeScript + XState v5)

```typescript
import { createMachine, assign } from 'xstate';

interface PaymentContext {
  amount: number;
  error: string | null;
  retryCount: number;
}

type PaymentEvent =
  | { type: 'SUBMIT'; amount: number }
  | { type: 'RETRY' }
  | { type: '3DS_SUCCESS' }
  | { type: 'CANCEL' };

export const paymentMachine = createMachine({
  id: 'payment',
  initial: 'idle',
  context: { amount: 0, error: null, retryCount: 0 } satisfies PaymentContext,
  states: {
    idle: {
      on: { SUBMIT: { target: 'validating', actions: assign({ amount: ({ event }) => event.amount }) } }
    },
    validating: {
      invoke: {
        src: 'validatePayment',
        onDone: [
          { guard: 'requires3DS', target: 'awaiting3DS' },
          { target: 'processing' }
        ],
        onError: { target: 'failed', actions: assign({ error: ({ event }) => event.error.message }) }
      }
    },
    processing: {
      invoke: {
        src: 'processPayment',
        onDone: 'success',
        onError: { target: 'failed', actions: assign({ error: ({ event }) => event.error.message }) }
      }
    },
    awaiting3DS: { on: { '3DS_SUCCESS': 'processing', CANCEL: 'idle' } },
    success: { type: 'final' },
    failed: {
      on: {
        RETRY: { guard: 'canRetry', target: 'validating', actions: assign({ retryCount: ({ context }) => context.retryCount + 1 }) },
        CANCEL: 'idle'
      }
    }
  }
}, {
  guards: {
    requires3DS: ({ context }) => context.amount > 5000,
    canRetry: ({ context }) => context.retryCount < 3
  }
});
```

---

## 6. Memory Aid

**"FSM = Traffic Light"** — a traffic light has explicit states (red/yellow/green), defined transitions (red→green on timer), and impossible states (can't be red AND green). XState is a traffic light for your UI.

**SCENE**: States, Context, Events, Node transitions, Entry/exit actions.

---

## 7. Why & How Summary

**Why XState?** — Impossible states become impossible. Complex UI flows are visualisable, testable, and self-documenting. State machines have been computer science fundamentals since Turing.

**How?** — Define states + transitions as a JSON machine config. Use `useMachine` hook in React or XState service in Angular. Services handle async (promises). Guards handle conditional branching. Actions handle side effects. XState Viz renders the machine as a directed graph.
