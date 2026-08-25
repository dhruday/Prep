# 427 – useEffect — Lifecycle, Cleanup, Dependencies

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
`useEffect` synchronizes a component with external systems (APIs, subscriptions, DOM). Runs after paint. **Cleanup function** runs before re-running and on unmount. **Dependency array** controls when it re-runs. Empty `[]` = mount only. No array = every render.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── BASIC useEffect ────
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false; // prevent state update on unmounted component
    
    async function fetchUser() {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      if (!cancelled) setUser(data); // only update if still mounted
    }
    
    fetchUser();
    
    return () => { cancelled = true; }; // cleanup
  }, [userId]); // re-run when userId changes

  return user ? <h1>{user.name}</h1> : <Spinner />;
}

// ──── DEPENDENCY ARRAY RULES ────
// Every reactive value used inside effect MUST be in deps
useEffect(() => {
  const interval = setInterval(() => {
    setCount(c => c + 1); // ✅ updater function — no dep needed for count
  }, 1000);
  return () => clearInterval(interval);
}, []); // ✅ empty deps — interval runs once

// ──── COMMON PATTERNS ────

// Subscription
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = (e) => setMessages(m => [...m, JSON.parse(e.data)]);
  return () => ws.close(); // cleanup: close connection
}, [url]);

// Event listener
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [onClose]);

// Document title
useEffect(() => {
  document.title = `${count} notifications`;
}, [count]);

// ──── ANTI-PATTERNS ────

// ❌ Missing cleanup — memory leak
useEffect(() => {
  const interval = setInterval(() => setCount(c => c + 1), 1000);
  // forgot return () => clearInterval(interval);
}, []);

// ❌ Object/array in deps — infinite loop
const options = { page: 1 }; // new ref every render!
useEffect(() => { fetch(options); }, [options]); // ♾️ loop!
// ✅ Fix: useMemo or primitive deps

// ❌ Fetching without cancellation
useEffect(() => {
  fetch(`/api/users/${id}`).then(r => r.json()).then(setUser);
  // If id changes fast: race condition!
}, [id]);
```

### useEffect Lifecycle Mapping
| Class Lifecycle | useEffect Equivalent |
|---|---|
| `componentDidMount` | `useEffect(() => {...}, [])` |
| `componentDidUpdate` | `useEffect(() => {...}, [deps])` |
| `componentWillUnmount` | `useEffect(() => { return () => cleanup }, [])` |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"useEffect synchronizes with external systems. Always include cleanup to prevent leaks. Dependency array controls re-runs — every reactive value must be listed. I use AbortController for fetch cancellation, updater functions to avoid stale closures, and separate effects for separate concerns."*

## 4. 🧠 MEMORY AID
**"useEffect: setup → cleanup → re-setup. [] = mount. [deps] = when deps change. No array = every render. Always cleanup subscriptions/intervals/listeners."**
