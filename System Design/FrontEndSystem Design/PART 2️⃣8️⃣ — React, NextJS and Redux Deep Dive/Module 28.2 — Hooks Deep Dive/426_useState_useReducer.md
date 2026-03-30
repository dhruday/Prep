# 426 – useState and useReducer — When to Use Each

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
`useState` for simple, independent state values. `useReducer` for complex state with multiple sub-values, interdependent transitions, or when next state depends on complex logic. Rule: if you have 3+ related states or a state machine, use `useReducer`.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── useState — simple, independent state ────
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// ──── useReducer — complex, related state ────
type State = { count: number; step: number; history: number[] };
type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'setStep'; payload: number }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step, history: [...state.history, state.count] };
    case 'decrement':
      return { ...state, count: state.count - state.step, history: [...state.history, state.count] };
    case 'setStep':
      return { ...state, step: action.payload };
    case 'reset':
      return { count: 0, step: 1, history: [] };
    default:
      return state;
  }
}

function StepCounter() {
  const [state, dispatch] = useReducer(reducer, { count: 0, step: 1, history: [] });
  return (
    <div>
      <span>{state.count}</span>
      <button onClick={() => dispatch({ type: 'increment' })}>+{state.step}</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-{state.step}</button>
      <input type="number" value={state.step}
        onChange={e => dispatch({ type: 'setStep', payload: Number(e.target.value) })} />
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
    </div>
  );
}

// ──── LAZY INITIALIZATION ────
// useState
const [state, setState] = useState(() => expensiveComputation()); // lazy init
// useReducer
const [state, dispatch] = useReducer(reducer, null, () => computeInitialState());
```

### Decision Matrix
| Scenario | Use |
|---|---|
| Single boolean/number/string | `useState` |
| 3+ related state values | `useReducer` |
| Complex transitions (state machine) | `useReducer` |
| Next state depends on previous | `useReducer` or `setState(prev => ...)` |
| State shared via context | `useReducer` (dispatch is stable) |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"useState for simple independent values. useReducer when state has multiple related sub-values or complex transitions. Reducer dispatch is referentially stable — great for context. I use the pattern: 3+ related states = useReducer."*

## 4. 🧠 MEMORY AID
**"useState = simple. useReducer = complex/related. dispatch is stable (no useCallback needed). Lazy init: useState(() => ...), useReducer(reducer, null, init)."**
