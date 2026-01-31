# Topic 38: Prop Drilling vs Context

**Context**: Part 5 — State Management (Core Interview Area)  
**Complexity**: Medium  
**Frequency**: Very High (Asked in 70%+ of interviews)  
**Prerequisites**: React components, props, state management basics  
**Interview Level**: Mid to Senior (3+ years)

────────────────────────────────────────────────────────────────────────────────
## Table of Contents
────────────────────────────────────────────────────────────────────────────────

1. [High-Level Overview](#1-high-level-overview)
2. [Deep-Dive Explanation](#2-deep-dive-explanation)
3. [Real-World Examples](#3-real-world-examples)
4. [Interview-Oriented Explanation](#4-interview-oriented-explanation)
5. [Code Examples & Implementation](#5-code-examples--implementation)
6. [Why & How Summary](#6-why--how-summary)

────────────────────────────────────────────────────────────────────────────────
## 1. High-Level Overview
────────────────────────────────────────────────────────────────────────────────

### What is Prop Drilling?

**Definition:**

> **Prop Drilling** is the pattern of passing data through multiple intermediate components via props, where the intermediate components don't use the data themselves but only serve as "pass-through" layers to deliver props to deeply nested children.

**The Problem:**

```
Component Tree:

<App>                           needs: user data
  ↓ (pass user)
  <Dashboard>                   doesn't need user, just passes
    ↓ (pass user)
    <Sidebar>                   doesn't need user, just passes
      ↓ (pass user)
      <Navigation>              doesn't need user, just passes
        ↓ (pass user)
        <UserMenu>              FINALLY uses user data!

Props drilling through 4 levels!
```

**Visual Representation:**

```
WITHOUT Context (Prop Drilling):
┌────────────────────────────────────────────────────────────┐
│                        <App>                               │
│                     user={userData}                        │
│                          ↓                                 │
│              ┌───────────┴───────────┐                     │
│              ↓                       ↓                     │
│        <Dashboard>              <Sidebar>                  │
│        user={user}              user={user} ⚠️             │
│              ↓                       ↓                     │
│        <Content>                <Navigation>               │
│        user={user} ⚠️            user={user} ⚠️             │
│              ↓                       ↓                     │
│        <Article>                <UserMenu>                 │
│        user={user} ⚠️            user={user} ✅ USES IT     │
│                                                            │
│ ⚠️ = Components that don't use user but must pass it      │
│                                                            │
│ Problems:                                                  │
│ ├─ 3 intermediate components polluted                     │
│ ├─ Hard to refactor                                       │
│ ├─ Tight coupling                                         │
│ └─ Props interface bloat                                  │
└────────────────────────────────────────────────────────────┘

WITH Context:
┌────────────────────────────────────────────────────────────┐
│                    <UserContext.Provider>                  │
│                     value={userData}                       │
│                          ↓                                 │
│              ┌───────────┴───────────┐                     │
│              ↓                       ↓                     │
│        <Dashboard>              <Sidebar>                  │
│         (no props) ✅            (no props) ✅              │
│              ↓                       ↓                     │
│        <Content>                <Navigation>               │
│        (no props) ✅            (no props) ✅               │
│              ↓                       ↓                     │
│        <Article>                <UserMenu>                 │
│        (no props) ✅            useContext(UserContext) ✅   │
│                                                            │
│ Benefits:                                                  │
│ ├─ Clean component interfaces                             │
│ ├─ Easy to refactor                                       │
│ ├─ Loose coupling                                         │
│ └─ Components only declare what they use                  │
└────────────────────────────────────────────────────────────┘
```

### When to Use Each Approach

**The 80/20 Rule:**

```
Decision Framework:

Prop Drilling is BETTER when:
✅ Passing props through 1-2 levels
✅ Explicit data flow is valuable
✅ Components are tightly related
✅ Data changes frequently (performance)
✅ Small, focused component trees

Context is BETTER when:
✅ Passing props through 3+ levels
✅ Many unrelated components need data
✅ Data changes infrequently
✅ Want to avoid props pollution
✅ Large, complex component trees

Real Distribution in Production Apps:
├─ Prop drilling: ~85% of data passing
├─ Context: ~10% of data passing
├─ Global state (Redux/Zustand): ~5%
└─ Start with props, upgrade when painful
```

### The Trade-offs

**Prop Drilling:**

```
Advantages:
┌─────────────────────────────────────────────┐
│ ✅ Explicit data flow                       │
│ ├─ Easy to trace where data comes from     │
│ ├─ IDE autocomplete works                  │
│ └─ TypeScript catches errors               │
│                                             │
│ ✅ No hidden dependencies                   │
│ ├─ Props interface shows requirements      │
│ ├─ Component boundaries clear              │
│ └─ Easier to understand & test             │
│                                             │
│ ✅ Better performance                       │
│ ├─ No context re-render issues             │
│ ├─ Predictable re-renders                  │
│ └─ React.memo works easily                 │
│                                             │
│ ✅ Easier debugging                         │
│ ├─ React DevTools shows prop flow          │
│ ├─ Can inspect props at each level         │
│ └─ No "magic" context lookups              │
└─────────────────────────────────────────────┘

Disadvantages:
┌─────────────────────────────────────────────┐
│ ❌ Becomes painful at scale                 │
│ ├─ Props through 5+ levels is tedious      │
│ ├─ Adding new prop = update many files     │
│ └─ Refactoring is expensive                │
│                                             │
│ ❌ Tight coupling                           │
│ ├─ Intermediate components coupled to data │
│ ├─ Can't reorder components easily         │
│ └─ Hard to extract components              │
│                                             │
│ ❌ Props interface pollution                │
│ ├─ Components declare unused props         │
│ ├─ Confusing for new developers            │
│ └─ Props list becomes overwhelming         │
│                                             │
│ ❌ Maintenance burden                       │
│ ├─ Renaming requires many file changes     │
│ ├─ Adding fields touches many components   │
│ └─ Technical debt accumulates              │
└─────────────────────────────────────────────┘
```

**Context API:**

```
Advantages:
┌─────────────────────────────────────────────┐
│ ✅ Clean component interfaces               │
│ ├─ Components only declare what they use   │
│ ├─ No props pollution                      │
│ └─ Easy to add/remove consumers            │
│                                             │
│ ✅ Loose coupling                           │
│ ├─ Intermediate components unaffected      │
│ ├─ Easy to refactor tree structure         │
│ └─ Components are more reusable            │
│                                             │
│ ✅ Scales well                              │
│ ├─ Add consumer anywhere in tree           │
│ ├─ No need to update intermediate layers   │
│ └─ Works for very deep trees               │
│                                             │
│ ✅ Built into React                         │
│ ├─ No extra dependencies                   │
│ ├─ Works with Suspense/Concurrent features │
│ └─ Well-documented & stable                │
└─────────────────────────────────────────────┘

Disadvantages:
┌─────────────────────────────────────────────┐
│ ❌ Hidden dependencies                      │
│ ├─ Hard to know what context component uses│
│ ├─ IDE autocomplete less helpful           │
│ └─ Must read component code to understand  │
│                                             │
│ ❌ Performance issues                       │
│ ├─ ALL consumers re-render on change       │
│ ├─ Can't easily optimize with React.memo   │
│ └─ Need workarounds (split contexts)       │
│                                             │
│ ❌ Testing complexity                       │
│ ├─ Must wrap component in provider         │
│ ├─ Need to mock context values             │
│ └─ More setup in tests                     │
│                                             │
│ ❌ Can be overused                          │
│ ├─ Teams put everything in context         │
│ ├─ Creates global state anti-patterns      │
│ └─ Harder to track data flow               │
└─────────────────────────────────────────────┘
```

### Mental Model

**The Analogy:**

```
Prop Drilling = Postal Mail Chain
┌────────────────────────────────────────────┐
│ You (App) → Friend (Dashboard) →           │
│ Friend's Roommate (Sidebar) →              │
│ Roommate's Friend (Navigation) →           │
│ Final Recipient (UserMenu)                 │
│                                            │
│ Letter passed hand-to-hand                 │
│ Everyone in chain must be present          │
│ Clear path, but tedious                    │
└────────────────────────────────────────────┘

Context = Radio Broadcast
┌────────────────────────────────────────────┐
│ You (Provider) broadcast signal            │
│ Anyone with radio (useContext) can listen  │
│ No intermediaries needed                   │
│ Listeners can tune in from anywhere        │
│                                            │
│ Efficient, but "magic" to newcomers        │
└────────────────────────────────────────────┘
```

### The Numbers

**Performance Comparison:**

```
Scenario: Update theme color (light/dark mode)

Component Tree: 100 components, 10 levels deep

PROP DRILLING:
├─ Initial render: 100 components rendered
├─ Theme change: Only consuming components re-render (~10)
├─ Re-render time: ~5ms
├─ But: Must pass theme through all 10 levels
└─ Maintenance cost: HIGH

CONTEXT (naive):
├─ Initial render: 100 components rendered
├─ Theme change: ALL consumers re-render (~50)
├─ Re-render time: ~25ms
├─ Easy to add new consumers
└─ Maintenance cost: LOW

CONTEXT (optimized with split contexts):
├─ Initial render: 100 components rendered
├─ Theme change: Only theme consumers re-render (~10)
├─ Re-render time: ~5ms
├─ Easy to add new consumers
└─ Maintenance cost: LOW

VERDICT:
├─ Prop drilling: Best for frequently changing data
├─ Context (naive): OK for infrequently changing data
├─ Context (optimized): Best overall for 3+ levels
└─ Real apps use mix: Props (80%), Context (15%), Redux (5%)
```

### Key Principles

**When to Use What:**

```
1. START WITH PROP DRILLING
   ├─ Default to explicit prop passing
   ├─ Upgrade to context when painful
   └─ Don't over-engineer from day 1

2. UPGRADE TO CONTEXT WHEN:
   ├─ Props drilling through 3+ levels
   ├─ Multiple unrelated components need data
   ├─ Adding new prop touches 5+ files
   └─ Intermediate components don't care about data

3. STAY WITH PROP DRILLING WHEN:
   ├─ Only 1-2 levels deep
   ├─ Data changes very frequently
   ├─ Components are tightly coupled anyway
   └─ Explicit flow is valuable for understanding

4. HYBRID APPROACH (BEST):
   ├─ Use props for immediate children
   ├─ Use context for deeply nested data
   ├─ Use Redux/Zustand for true global state
   └─ Pick right tool for each situation

Example:
<App>
  <Dashboard user={user}>          ← Props (1 level)
    <Content posts={posts}>        ← Props (2 levels)
      <Article>                    ← Uses context
        const theme = useContext(ThemeContext);
        const auth = useContext(AuthContext);
      </Article>
    </Content>
  </Dashboard>
</App>

Theme & Auth: Context (used everywhere)
User & Posts: Props (component-specific, passed 1-2 levels)
```

────────────────────────────────────────────────────────────────────────────────
## 2. Deep-Dive Explanation
────────────────────────────────────────────────────────────────────────────────

### The Anatomy of Prop Drilling

**How Props Flow Through Components:**

```
Component Tree with Props Flow:

┌────────────────────────────────────────────────────────────┐
│ function App() {                                           │
│   const user = { id: 1, name: 'John' };                   │
│   return <Layout user={user} />;                          │
│ }                                                          │
│                                                            │
│ React internals:                                           │
│ 1. Create <Layout> element                                │
│ 2. Attach props object: { user: {...} }                   │
│ 3. Call Layout function component with props              │
└────────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────────┐
│ function Layout({ user }) {                                │
│   // user is in scope but Layout doesn't use it           │
│   return (                                                 │
│     <div>                                                  │
│       <Header user={user} />                              │
│       <Sidebar user={user} />                             │
│     </div>                                                 │
│   );                                                       │
│ }                                                          │
│                                                            │
│ Problems:                                                  │
│ ├─ Layout must declare 'user' in props                    │
│ ├─ Layout doesn't use 'user' at all                       │
│ ├─ TypeScript forces user in interface                    │
│ └─ Adding new field requires updating Layout              │
└────────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────────┐
│ function Header({ user }) {                                │
│   // Header also doesn't use user                          │
│   return (                                                 │
│     <header>                                               │
│       <Logo />                                             │
│       <Navigation user={user} />                          │
│     </header>                                              │
│   );                                                       │
│ }                                                          │
│                                                            │
│ Coupling Level: HIGH                                       │
│ ├─ Header coupled to user shape                           │
│ ├─ Can't reuse Header without user                        │
│ └─ Refactoring Header requires changing parent            │
└────────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────────┐
│ function Navigation({ user }) {                            │
│   return (                                                 │
│     <nav>                                                  │
│       <UserMenu user={user} />  {/* Finally used! */}     │
│     </nav>                                                 │
│   );                                                       │
│ }                                                          │
└────────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────────┐
│ function UserMenu({ user }) {                              │
│   return (                                                 │
│     <div>                                                  │
│       <img src={user.avatar} />                           │
│       <span>{user.name}</span>                            │
│     </div>                                                 │
│   );                                                       │
│ }                                                          │
│                                                            │
│ This is the ONLY component that uses user!                │
└────────────────────────────────────────────────────────────┘

Summary:
├─ 4 components in chain
├─ 3 just pass props (75% overhead)
├─ 1 actually uses the data
└─ Adding field requires editing 4 files
```

**The Cost of Prop Drilling:**

```
Real Example: Adding 'theme' prop

Before (just user):
├─ App.tsx
├─ Layout.tsx
├─ Header.tsx
├─ Navigation.tsx
└─ UserMenu.tsx

Task: Add theme support to UserMenu

Changes Required:
┌──────────────────────────────────────────┐
│ File 1: App.tsx                          │
│ - Add theme state                        │
│ - Pass to Layout                         │
│                                          │
│ File 2: Layout.tsx                       │
│ - Add theme to props interface           │
│ - Pass to Header                         │
│                                          │
│ File 3: Header.tsx                       │
│ - Add theme to props interface           │
│ - Pass to Navigation                     │
│                                          │
│ File 4: Navigation.tsx                   │
│ - Add theme to props interface           │
│ - Pass to UserMenu                       │
│                                          │
│ File 5: UserMenu.tsx                     │
│ - Add theme to props interface           │
│ - Actually USE theme                     │
└──────────────────────────────────────────┘

Result:
├─ 5 files modified
├─ 4 TypeScript interfaces updated
├─ 30 minutes of work
├─ Risk of breaking intermediate components
└─ Testing 5 components instead of 1

With Context (comparison):
├─ Add ThemeContext.Provider in App
├─ useContext(ThemeContext) in UserMenu
├─ 2 files modified
├─ 5 minutes of work
└─ No intermediate components affected ✅
```

### The Anatomy of Context

**How Context Works Internally:**

```
Context Creation & Usage:

STEP 1: Create Context
┌────────────────────────────────────────────────────────────┐
│ const UserContext = React.createContext(null);             │
│                                                            │
│ React Internals:                                           │
│ 1. Creates context object with unique ID                  │
│ 2. Context object contains:                               │
│    ├─ Provider component                                  │
│    ├─ Consumer component (legacy)                         │
│    ├─ Current value                                       │
│    └─ Subscriber list                                     │
└────────────────────────────────────────────────────────────┘

STEP 2: Provide Value
┌────────────────────────────────────────────────────────────┐
│ function App() {                                           │
│   const user = { id: 1, name: 'John' };                   │
│   return (                                                 │
│     <UserContext.Provider value={user}>                   │
│       <Layout />                                           │
│     </UserContext.Provider>                                │
│   );                                                       │
│ }                                                          │
│                                                            │
│ React Internals:                                           │
│ 1. Provider renders and stores value in fiber node        │
│ 2. Fiber node has reference to context object             │
│ 3. React traverses up tree to find provider when needed   │
└────────────────────────────────────────────────────────────┘

STEP 3: Consume Value
┌────────────────────────────────────────────────────────────┐
│ function UserMenu() {                                      │
│   const user = useContext(UserContext);                   │
│   return <div>{user.name}</div>;                          │
│ }                                                          │
│                                                            │
│ React Internals (useContext):                             │
│ 1. Get current fiber node                                 │
│ 2. Walk up fiber tree looking for UserContext.Provider    │
│ 3. Read value from provider's fiber node                  │
│ 4. Subscribe component to provider                        │
│ 5. Return value                                            │
│                                                            │
│ When provider value changes:                               │
│ 1. React marks provider as updated                        │
│ 2. Traverses fiber tree looking for subscribers           │
│ 3. Schedules re-render for all subscribers                │
│ 4. NO WAY to skip intermediate re-renders (key issue!)    │
└────────────────────────────────────────────────────────────┘

Fiber Tree Structure:
                   App
                    ↓
          UserContext.Provider
           (stores value: user)
                    ↓
                 Layout
                    ↓
            ┌───────┴───────┐
            ↓               ↓
        Header          Sidebar
            ↓               ↓
       Navigation      Content
            ↓
        UserMenu
    (subscribed to UserContext)

When user changes:
1. Provider re-renders
2. Layout re-renders (even if memoized!)
3. Header re-renders
4. Navigation re-renders
5. UserMenu re-renders ← Only one that needs to!

This is the PERFORMANCE PROBLEM with Context.
```

### The Context Performance Problem

**Why Context Can Be Slow:**

```
Problem: ALL consumers re-render when context value changes

Example: Theme + User in one context

const AppContext = React.createContext();

function App() {
  const [user, setUser] = useState({ name: 'John' });
  const [theme, setTheme] = useState('light');
  
  const value = { user, theme };
  
  return (
    <AppContext.Provider value={value}>
      <Header />      {/* Uses theme */}
      <Content />     {/* Uses user */}
      <Sidebar />     {/* Uses theme */}
      <Footer />      {/* Uses user */}
    </AppContext.Provider>
  );
}

┌──────────────────────────────────────────────────────────┐
│ Problem Flow:                                            │
│                                                          │
│ User changes theme:                                      │
│ ├─ setTheme('dark') called                              │
│ ├─ App re-renders                                       │
│ ├─ New value object created: { user, theme }           │
│ ├─ value !== oldValue (new object reference!)          │
│ ├─ React notifies ALL context consumers                │
│ │   ├─ Header re-renders ✅ (uses theme, makes sense)  │
│ │   ├─ Content re-renders ❌ (uses user, unnecessary)  │
│ │   ├─ Sidebar re-renders ✅ (uses theme, makes sense) │
│ │   └─ Footer re-renders ❌ (uses user, unnecessary)   │
│ └─ Result: 4 re-renders, but only 2 needed!            │
│                                                          │
│ Performance Impact:                                      │
│ ├─ Wasted renders: 50% (2 out of 4)                    │
│ ├─ Wasted computation: Varies by component              │
│ └─ Can cause jank if components are expensive           │
└──────────────────────────────────────────────────────────┘

Solution: Split contexts!

const UserContext = React.createContext();
const ThemeContext = React.createContext();

function App() {
  const [user, setUser] = useState({ name: 'John' });
  const [theme, setTheme] = useState('light');
  
  return (
    <UserContext.Provider value={user}>
      <ThemeContext.Provider value={theme}>
        <Header />      {/* Uses theme only */}
        <Content />     {/* Uses user only */}
        <Sidebar />     {/* Uses theme only */}
        <Footer />      {/* Uses user only */}
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

┌──────────────────────────────────────────────────────────┐
│ Optimized Flow:                                          │
│                                                          │
│ User changes theme:                                      │
│ ├─ setTheme('dark') called                              │
│ ├─ App re-renders                                       │
│ ├─ ThemeContext.Provider updates                        │
│ ├─ React notifies ONLY theme consumers                  │
│ │   ├─ Header re-renders ✅ (uses theme)               │
│ │   ├─ Sidebar re-renders ✅ (uses theme)              │
│ │   ├─ Content SKIPPED ✅ (doesn't use theme)          │
│ │   └─ Footer SKIPPED ✅ (doesn't use theme)           │
│ └─ Result: 2 re-renders (exactly what's needed!)       │
│                                                          │
│ Performance Impact:                                      │
│ ├─ Wasted renders: 0% (0 out of 2)                     │
│ ├─ Optimal performance ✅                                │
│ └─ User experience: Smooth                              │
└──────────────────────────────────────────────────────────┘
```

**Why value object matters:**

```
The Reference Equality Problem:

❌ BAD: New object every render
function App() {
  const [user, setUser] = useState({ name: 'John' });
  const [theme, setTheme] = useState('light');
  
  // 🚨 PROBLEM: New object created every render!
  const value = { user, theme };
  
  return (
    <AppContext.Provider value={value}>
      <Layout />
    </AppContext.Provider>
  );
}

Why this is bad:
1. App re-renders (for any reason, even unrelated)
2. value = { user, theme } creates NEW object
3. { user, theme } !== previousValue (different reference)
4. React sees value changed
5. ALL context consumers re-render
6. Even though user and theme didn't actually change!

Result:
├─ Every App re-render triggers context consumers
├─ Massive performance degradation
├─ Can cause infinite render loops
└─ User experience: Terrible

✅ GOOD: Memoize value object
function App() {
  const [user, setUser] = useState({ name: 'John' });
  const [theme, setTheme] = useState('light');
  
  // ✅ SOLUTION: Memoize value
  const value = useMemo(
    () => ({ user, theme }),
    [user, theme]
  );
  
  return (
    <AppContext.Provider value={value}>
      <Layout />
    </AppContext.Provider>
  );
}

Why this works:
1. App re-renders (for any reason)
2. useMemo checks dependencies: [user, theme]
3. If user and theme didn't change, return cached value
4. value === previousValue (same reference)
5. React sees no change
6. Context consumers DON'T re-render ✅

Result:
├─ App can re-render without affecting consumers
├─ Consumers only re-render when user or theme change
├─ Optimal performance
└─ User experience: Smooth

Performance Comparison:
┌────────────────────────────────────────────┐
│ Scenario: App re-renders 10 times/second  │
│ (e.g., from animation or frequent updates) │
│                                            │
│ Without useMemo:                           │
│ ├─ Context consumers: 10 re-renders/sec   │
│ ├─ Wasted computation: HIGH               │
│ └─ FPS drops, UI janky                    │
│                                            │
│ With useMemo:                              │
│ ├─ Context consumers: 0 re-renders/sec    │
│ ├─ Wasted computation: ZERO               │
│ └─ 60 FPS maintained ✅                    │
└────────────────────────────────────────────┘
```

### When Prop Drilling is Actually Better

**Performance Comparison:**

```
Scenario: Frequently Updating Counter

Component Tree:
<App>                    counter state
  <Parent>               pass counter
    <Child>              pass counter
      <Display>          show counter

Option 1: Prop Drilling
function App() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => setCount(c => c + 1), 100);
    return () => clearInterval(timer);
  }, []);
  
  return <Parent count={count} />;
}

function Parent({ count }) {
  return (
    <div>
      <h1>Parent</h1>
      <Child count={count} />
    </div>
  );
}

function Child({ count }) {
  return (
    <div>
      <h2>Child</h2>
      <Display count={count} />
    </div>
  );
}

const Display = memo(({ count }) => {
  return <div>Count: {count}</div>;
});

Performance:
├─ Counter updates 10x/second
├─ App re-renders: 10x/sec
├─ Parent re-renders: 10x/sec
├─ Child re-renders: 10x/sec
├─ Display re-renders: 10x/sec (React.memo doesn't help, props changed)
├─ Total: 40 re-renders/sec
└─ Performance: Acceptable (fast renders)

Option 2: Context
const CountContext = React.createContext();

function App() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => setCount(c => c + 1), 100);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <CountContext.Provider value={count}>
      <Parent />
    </CountContext.Provider>
  );
}

function Parent() {
  return (
    <div>
      <h1>Parent</h1>
      <Child />
    </div>
  );
}

function Child() {
  return (
    <div>
      <h2>Child</h2>
      <Display />
    </div>
  );
}

const Display = memo(() => {
  const count = useContext(CountContext);
  return <div>Count: {count}</div>;
});

Performance:
├─ Counter updates 10x/second
├─ App re-renders: 10x/sec
├─ Parent re-renders: 10x/sec (context provider changed!)
├─ Child re-renders: 10x/sec (parent re-rendered)
├─ Display re-renders: 10x/sec (subscribed to context)
├─ Total: 40 re-renders/sec
└─ Performance: SAME as prop drilling!

┌───────────────────────────────────────────────────────────┐
│ VERDICT: For frequently updating values, prop drilling    │
│ and context have similar performance.                     │
│                                                            │
│ Prop drilling is BETTER because:                          │
│ ├─ More explicit (easier to understand)                   │
│ ├─ React.memo can optimize if props are primitives       │
│ ├─ No hidden dependencies                                 │
│ └─ Simpler debugging                                      │
│                                                            │
│ Context is BETTER when:                                   │
│ ├─ Values change INFREQUENTLY (theme, auth)              │
│ ├─ Many distant components need data                      │
│ ├─ Prop drilling through 5+ levels                       │
│ └─ Maintenance > performance                              │
└───────────────────────────────────────────────────────────┘
```

### The Hybrid Approach (Best Practice)

**Combining Both Patterns:**

```
Real-World Component Architecture:

<App>
  ├─ Auth: Context (global, rare changes)
  ├─ Theme: Context (global, rare changes)
  └─ Router: Context (built-in)
      ↓
  <Dashboard user={user}>         ← Props (immediate child)
      ↓
    <Sidebar sections={sections}> ← Props (related data)
        ↓
      <Navigation>
        const theme = useContext(ThemeContext);  ← Context
        const auth = useContext(AuthContext);    ← Context
      </Navigation>

Decision Flow:
┌────────────────────────────────────────────┐
│ 1. IS DATA GLOBAL & RARELY CHANGES?        │
│    (auth, theme, locale)                   │
│    └─ YES → Context                        │
│                                            │
│ 2. IS DATA DEEPLY NESTED (3+ levels)?      │
│    └─ YES → Consider Context               │
│    └─ NO → Keep with props                 │
│                                            │
│ 3. IS DATA USED BY MANY COMPONENTS?        │
│    └─ YES → Context or Redux               │
│    └─ NO → Props                           │
│                                            │
│ 4. DOES DATA CHANGE FREQUENTLY?            │
│    └─ YES → Props (better performance)     │
│    └─ NO → Context (better ergonomics)     │
└────────────────────────────────────────────┘

Real Distribution:
├─ Props: 80% (most data flow)
├─ Context: 15% (theme, auth, router)
├─ Redux/Zustand: 5% (complex state)
└─ Start with props, upgrade when needed
```

### Component Coupling Analysis

**How Prop Drilling Affects Coupling:**

```
TIGHT COUPLING (Prop Drilling):

function Parent({ user, theme, locale, cart }) {
  return (
    <Child
      user={user}
      theme={theme}
      locale={locale}
      cart={cart}
    />
  );
}

Problems:
├─ Parent knows about Child's dependencies
├─ Adding prop to Child requires changing Parent
├─ Parent tightly coupled to Child's data needs
├─ Can't easily swap Child for different component
└─ Testing Parent requires mocking Child's props

LOOSE COUPLING (Context):

function Parent() {
  return <Child />;
}

function Child() {
  const user = useContext(UserContext);
  const theme = useContext(ThemeContext);
  // ... use data
}

Benefits:
├─ Parent doesn't know about Child's dependencies
├─ Adding context to Child doesn't affect Parent
├─ Parent loosely coupled from Child's data needs
├─ Easy to swap Child for different component
└─ Testing Parent doesn't require mocking Child's data

Trade-off:
├─ Loose coupling better for large codebases
├─ But makes data flow less explicit
└─ Balance based on team size & app complexity
```

### Real-World Decision Matrix

```
┌──────────────────────────────────────────────────────────────┐
│ Data Type         │ Depth │ Frequency │ Solution             │
├──────────────────────────────────────────────────────────────┤
│ Auth token        │ Any   │ Rare      │ Context ✅           │
│ Current user      │ Any   │ Rare      │ Context ✅           │
│ Theme             │ Any   │ Rare      │ Context ✅           │
│ Locale            │ Any   │ Rare      │ Context ✅           │
│ Router params     │ Any   │ Rare      │ Context (built-in) ✅│
│ Shopping cart     │ Any   │ Medium    │ Redux/Zustand ✅     │
│ Form state        │ 1-2   │ High      │ Props ✅             │
│ List data         │ 1-2   │ Medium    │ Props ✅             │
│ Modal state       │ 1-2   │ Medium    │ Props ✅             │
│ Animation value   │ 1-2   │ Very High │ Props ✅             │
│ Search results    │ 3+    │ Medium    │ React Query ✅       │
│ Product catalog   │ Any   │ Medium    │ React Query ✅       │
│ WebSocket data    │ Any   │ High      │ Redux + middleware ✅│
│ Page-specific     │ Any   │ Any       │ Props ✅             │
└──────────────────────────────────────────────────────────────┘

Rules of Thumb:
1. Start with props
2. Upgrade to context at 3+ levels
3. Use Redux/Zustand for complex shared state
4. Use React Query for server state
5. Never use context for high-frequency updates
```

────────────────────────────────────────────────────────────────────────────────
## 3. Real-World Examples
────────────────────────────────────────────────────────────────────────────────

### Example 1: Theme System (Perfect Context Use Case)

**Scenario:** Application-wide dark/light theme that affects all components.

**Why Context is Perfect Here:**

```
Requirements:
├─ Theme affects every component (colors, fonts, spacing)
├─ Changes infrequently (user toggles once per session)
├─ Needed at arbitrary depths (deep in component tree)
└─ Would be painful with prop drilling

Component Tree:
<App>
  <Header>
    <Logo>            ← needs theme
    <Navigation>      ← needs theme
      <NavLink>       ← needs theme
        <Icon>        ← needs theme
  <MainContent>
    <Sidebar>         ← needs theme
    <ArticleList>     ← needs theme
      <Article>       ← needs theme
        <Author>      ← needs theme
  <Footer>            ← needs theme

20+ components at various depths all need theme!
```

**Implementation:**

```typescript
// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Initialize from localStorage or system preference
    const stored = localStorage.getItem('theme') as Theme;
    if (stored) return stored;
    
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });
  
  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  const value = { theme, toggleTheme, setTheme };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// Usage in any component (no prop drilling!)
function Header() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <header>
      <Logo />
      <nav>
        <NavLinks />
      </nav>
      <button onClick={toggleTheme}>
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </header>
  );
}

function Article({ title, content }) {
  const { theme } = useTheme();
  
  return (
    <article className={`article article--${theme}`}>
      <h2>{title}</h2>
      <p>{content}</p>
    </article>
  );
}

function Footer() {
  const { theme } = useTheme();
  
  return (
    <footer className={`footer footer--${theme}`}>
      <p>© 2026 Company</p>
    </footer>
  );
}
```

**Why This Works:**

```
Benefits of Context for Theme:
┌────────────────────────────────────────────┐
│ ✅ No prop drilling through 20+ components │
│ ✅ Add theme to any component easily       │
│ ✅ Single source of truth                  │
│ ✅ Persists across page navigation         │
│ ✅ Changes infrequently (no perf issues)   │
│ ✅ Clean component interfaces              │
└────────────────────────────────────────────┘

Performance:
├─ Theme change: Once per session (~0.1 times/min)
├─ Re-renders: 20 components (~50ms)
├─ Acceptable: User expects visual change
└─ No performance issues

If we used prop drilling:
├─ Must pass theme through every level
├─ 20+ components need theme in props
├─ Adding new themed component: Update 5+ files
├─ Maintenance nightmare
└─ NOT worth it for infrequent updates

Verdict: Context is PERFECT here ✅
```

### Example 2: Authentication State (Context vs Redux)

**Scenario:** User authentication state needed throughout app.

**Option 1: Context (Good for small-medium apps)**

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setUser(data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);
  
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) throw new Error('Login failed');
      
      const data = await response.json();
      setUser(data.user);
      localStorage.setItem('token', data.token);
    } finally {
      setIsLoading(false);
    }
  };
  
  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };
  
  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Usage
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return <>{children}</>;
}

function UserMenu() {
  const { user, logout } = useAuth();
  
  if (!user) return null;
  
  return (
    <div className="user-menu">
      <img src={user.avatar} alt={user.name} />
      <span>{user.name}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

function WelcomeMessage() {
  const { user } = useAuth();
  
  return <h1>Welcome back, {user?.name}!</h1>;
}
```

**When Context is Good Enough:**

```
✅ Use Context for Auth when:
├─ Small to medium app (< 50 components)
├─ Auth data is simple (user, token, isAuthenticated)
├─ No complex auth flows (SSO, multi-factor, etc.)
├─ Team is comfortable with Context
└─ Don't need middleware or devtools

Example Apps:
├─ Internal dashboard
├─ Simple SaaS app
├─ Blog with login
└─ Portfolio site with admin

Performance:
├─ Auth changes: ~1 time per session
├─ Login/logout: User expects page reload feel
├─ Re-renders: Acceptable (infrequent)
└─ No performance issues

Simplicity:
├─ No dependencies (built into React)
├─ Easy to understand
├─ Quick to implement
└─ Good for small teams
```

**Option 2: Redux (Better for large apps)**

```typescript
// When to use Redux instead of Context for Auth:

❌ Context becomes problematic when:
├─ Need complex auth flows (OAuth, SSO, MFA)
├─ Auth state has many related pieces (permissions, roles, teams)
├─ Need to persist auth state across tabs (middleware)
├─ Want time-travel debugging
├─ Large team needs patterns and structure
└─ Need to test auth logic separately

✅ Redux is better when:
├─ Large app (100+ components)
├─ Complex permissions system
├─ Need middleware (logging, analytics, persistence)
├─ Multiple auth-related states
├─ Team prefers Redux patterns
└─ Need Redux DevTools

Example: Enterprise B2B SaaS
├─ Multi-tenant with workspace switching
├─ Role-based permissions
├─ SSO integration
├─ Audit logging
└─ Complex authorization rules

In this case, Redux provides:
├─ Structured auth state management
├─ Middleware for SSO token refresh
├─ DevTools for debugging auth issues
├─ Clear patterns for auth-related actions
└─ Easier to test complex auth logic
```

### Example 3: Form Data (Prop Drilling is Better)

**Scenario:** Multi-step form with shared state.

**Why Prop Drilling is Better:**

```
Component Structure:
<CheckoutForm>
  <ShippingStep>
    <AddressForm>
      <AddressInput />
  <PaymentStep>
    <CreditCardForm>
      <CardInput />
  <ReviewStep>
    <OrderSummary>

Depth: 3-4 levels
Update Frequency: High (every keystroke)
Scope: Form-specific (not needed elsewhere)
```

**Implementation (Prop Drilling):**

```typescript
interface FormData {
  shipping: {
    name: string;
    address: string;
    city: string;
    zip: string;
  };
  payment: {
    cardNumber: string;
    expiry: string;
    cvv: string;
  };
}

function CheckoutForm() {
  const [formData, setFormData] = useState<FormData>({
    shipping: { name: '', address: '', city: '', zip: '' },
    payment: { cardNumber: '', expiry: '', cvv: '' }
  });
  const [currentStep, setCurrentStep] = useState(0);
  
  const updateShipping = (updates: Partial<FormData['shipping']>) => {
    setFormData(prev => ({
      ...prev,
      shipping: { ...prev.shipping, ...updates }
    }));
  };
  
  const updatePayment = (updates: Partial<FormData['payment']>) => {
    setFormData(prev => ({
      ...prev,
      payment: { ...prev.payment, ...updates }
    }));
  };
  
  return (
    <form>
      {currentStep === 0 && (
        <ShippingStep
          data={formData.shipping}
          onUpdate={updateShipping}
          onNext={() => setCurrentStep(1)}
        />
      )}
      
      {currentStep === 1 && (
        <PaymentStep
          data={formData.payment}
          onUpdate={updatePayment}
          onNext={() => setCurrentStep(2)}
          onBack={() => setCurrentStep(0)}
        />
      )}
      
      {currentStep === 2 && (
        <ReviewStep
          formData={formData}
          onBack={() => setCurrentStep(1)}
          onSubmit={handleSubmit}
        />
      )}
    </form>
  );
}

function ShippingStep({ data, onUpdate, onNext }) {
  return (
    <div>
      <h2>Shipping Information</h2>
      <AddressForm data={data} onUpdate={onUpdate} />
      <button onClick={onNext}>Next</button>
    </div>
  );
}

function AddressForm({ data, onUpdate }) {
  return (
    <div>
      <input
        value={data.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="Full Name"
      />
      <input
        value={data.address}
        onChange={(e) => onUpdate({ address: e.target.value })}
        placeholder="Address"
      />
      {/* More inputs... */}
    </div>
  );
}
```

**Why Prop Drilling is Better Here:**

```
Reasons NOT to use Context:
┌────────────────────────────────────────────┐
│ ❌ Updates on every keystroke              │
│    ├─ 50-100 updates per form fill        │
│    ├─ Context would re-render ALL steps   │
│    └─ Even inactive steps re-render       │
│                                            │
│ ❌ Form state is component-specific        │
│    ├─ Not needed outside CheckoutForm     │
│    ├─ Creating context is over-engineering│
│    └─ Props are simpler                   │
│                                            │
│ ❌ Only 2-3 levels deep                    │
│    ├─ Not painful to pass props           │
│    ├─ Clear data flow                     │
│    └─ Easy to understand                  │
│                                            │
│ ✅ Prop drilling advantages:               │
│    ├─ Explicit data flow                  │
│    ├─ Easy to test each step              │
│    ├─ Type-safe with TypeScript           │
│    ├─ Can optimize with React.memo        │
│    └─ No context complexity               │
└────────────────────────────────────────────┘

Performance Comparison:
├─ Prop Drilling: Only active step re-renders
├─ Context: ALL steps re-render on every keystroke
├─ Winner: Prop Drilling (3-4× faster)
└─ User experience: Smooth typing

Alternative: If form gets complex, use:
├─ React Hook Form (better form library)
├─ Formik (popular form library)
├─ Zustand (for very complex forms)
└─ NOT Context (wrong tool for high-frequency updates)
```

### Example 4: Data Table with Filters (Hybrid Approach)

**Scenario:** Complex data table with filters, sorting, pagination.

**Optimal Solution: Mix of Props and Context:**

```typescript
// Global state (Context): Infrequent updates
const TableConfigContext = createContext();

function TableConfigProvider({ children }) {
  const [pageSize, setPageSize] = useState(25);
  const [theme, setTheme] = useState('light');
  
  const value = useMemo(
    () => ({ pageSize, setPageSize, theme, setTheme }),
    [pageSize, theme]
  );
  
  return (
    <TableConfigContext.Provider value={value}>
      {children}
    </TableConfigContext.Provider>
  );
}

// Local state (Props): Frequent updates
function DataTablePage() {
  const [data, setData] = useState([]);
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  
  // Fetch data
  useEffect(() => {
    fetchData({ sortColumn, sortDirection, filters, currentPage })
      .then(setData);
  }, [sortColumn, sortDirection, filters, currentPage]);
  
  return (
    <div>
      <Filters
        filters={filters}
        onFilterChange={setFilters}
      />
      
      <DataTable
        data={data}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={(col, dir) => {
          setSortColumn(col);
          setSortDirection(dir);
        }}
      />
      
      <Pagination
        currentPage={currentPage}
        totalPages={100}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

function DataTable({ data, sortColumn, sortDirection, onSort }) {
  const { theme } = useContext(TableConfigContext); // Context for theme
  
  return (
    <table className={`table table--${theme}`}>
      <thead>
        <tr>
          <TableHeader
            column="name"
            label="Name"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
          <TableHeader
            column="email"
            label="Email"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <TableRow key={row.id} row={row} />
        ))}
      </tbody>
    </table>
  );
}

function TableHeader({ column, label, sortColumn, sortDirection, onSort }) {
  const isActive = sortColumn === column;
  
  return (
    <th
      onClick={() => onSort(column, isActive && sortDirection === 'asc' ? 'desc' : 'asc')}
    >
      {label}
      {isActive && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
    </th>
  );
}
```

**Why Hybrid Approach:**

```
Decision Breakdown:

Context (Theme, PageSize):
├─ Changes: Infrequently (user settings)
├─ Scope: Needed by multiple components
├─ Performance: Acceptable (rare updates)
└─ Verdict: Context ✅

Props (Sort, Filters, Pagination):
├─ Changes: Frequently (user interactions)
├─ Scope: Table-specific
├─ Performance: Critical (fast updates needed)
└─ Verdict: Props ✅

Results:
┌────────────────────────────────────────────┐
│ User clicks sort:                          │
│ ├─ Only Table and TableHeader re-render   │
│ ├─ Filters and Pagination unchanged       │
│ ├─ Fast, responsive UI ✅                  │
│ └─ 5-10ms per interaction                 │
│                                            │
│ User changes theme:                        │
│ ├─ All table components re-render         │
│ ├─ Expected: Visual change                │
│ ├─ Acceptable: Rare operation             │
│ └─ 50ms (imperceptible)                   │
└────────────────────────────────────────────┘

Anti-Pattern (All Context):
├─ Putting sort, filters in context
├─ Every interaction re-renders everything
├─ Sluggish, janky UI
└─ User complains about performance
```

### Example 5: Internationalization (i18n) - Context is Essential

**Scenario:** Multi-language application.

```typescript
// contexts/I18nContext.tsx
import React, { createContext, useContext, useState } from 'react';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';

const translations = { en, es, fr };

type Locale = 'en' | 'es' | 'fr';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = localStorage.getItem('locale') as Locale;
    return stored || 'en';
  });
  
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[locale];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };
  
  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
    document.documentElement.setAttribute('lang', newLocale);
  };
  
  const value = { locale, setLocale: handleSetLocale, t };
  
  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

// Usage throughout app
function Header() {
  const { t, locale, setLocale } = useI18n();
  
  return (
    <header>
      <h1>{t('header.title')}</h1>
      <select value={locale} onChange={(e) => setLocale(e.target.value)}>
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
      </select>
    </header>
  );
}

function ProductCard({ product }) {
  const { t } = useI18n();
  
  return (
    <div>
      <h3>{product.name}</h3>
      <p>{product.price} {t('currency.usd')}</p>
      <button>{t('product.addToCart')}</button>
    </div>
  );
}

function CheckoutPage() {
  const { t } = useI18n();
  
  return (
    <div>
      <h1>{t('checkout.title')}</h1>
      <p>{t('checkout.description')}</p>
      <button>{t('checkout.completeOrder')}</button>
    </div>
  );
}
```

**Why Context is Perfect for i18n:**

```
Reasons Context is ESSENTIAL:
┌────────────────────────────────────────────┐
│ ✅ Affects EVERY component with text       │
│    ├─ 100+ components need translations   │
│    ├─ At all depths of component tree     │
│    └─ Impossible with prop drilling       │
│                                            │
│ ✅ Changes very infrequently               │
│    ├─ User selects language once          │
│    ├─ Rarely changed during session       │
│    └─ No performance issues               │
│                                            │
│ ✅ Function-based API                      │
│    ├─ t('key') is clean                   │
│    ├─ Easy to use anywhere                │
│    └─ Type-safe with TypeScript           │
│                                            │
│ ✅ No alternatives that make sense         │
│    ├─ Prop drilling: Impossible           │
│    ├─ Redux: Overkill                     │
│    └─ Context: Perfect fit ✅              │
└────────────────────────────────────────────┘

Performance:
├─ Language change: ~0.1 times per session
├─ Re-renders: All text components (~100)
├─ Time: ~100-200ms
├─ Expected: User knows language is changing
└─ No complaints

Industry Standard:
├─ React-i18next uses Context
├─ FormatJS uses Context
├─ React-intl uses Context
└─ Context is the proven solution for i18n
```

### Example 6: When Prop Drilling Beats Context (Counter Example)

**Scenario:** Nested components with frequently updating data.

```typescript
// ❌ BAD: Using Context for frequent updates
const CounterContext = createContext();

function App() {
  const [count, setCount] = useState(0);
  
  // Update 10 times per second
  useEffect(() => {
    const timer = setInterval(() => setCount(c => c + 1), 100);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <CounterContext.Provider value={count}>
      <Parent />
    </CounterContext.Provider>
  );
}

function Parent() {
  console.log('Parent render'); // Renders 10x/sec!
  return <Child />;
}

function Child() {
  console.log('Child render'); // Renders 10x/sec!
  return <Display />;
}

function Display() {
  const count = useContext(CounterContext);
  return <div>Count: {count}</div>;
}

// Problem:
// ├─ Provider updates → ALL components re-render
// ├─ Parent, Child re-render unnecessarily
// ├─ 20-30 re-renders per second
// └─ Janky UI, wasted computation

// ✅ GOOD: Using Props (with optimization)
function App() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => setCount(c => c + 1), 100);
    return () => clearInterval(timer);
  }, []);
  
  return <Parent count={count} />;
}

const Parent = memo(({ count }) => {
  console.log('Parent render'); // Only when count changes
  return <Child count={count} />;
});

const Child = memo(({ count }) => {
  console.log('Child render'); // Only when count changes
  return <Display count={count} />;
});

const Display = ({ count }) => {
  return <div>Count: {count}</div>;
};

// With React.memo:
// ├─ Only Display re-renders (has changing prop)
// ├─ Parent, Child memoized (props haven't changed)
// └─ Optimal performance ✅

// Even Better: Just pass to Display directly
function App() {
  const [count, setCount] = useState(0);
  
  return <Parent count={count} />;
}

function Parent({ count }) {
  return (
    <div>
      <h1>Parent</h1>
      <Child count={count} />
    </div>
  );
}

function Child({ count }) {
  return (
    <div>
      <h2>Child</h2>
      <Display count={count} />
    </div>
  );
}

const Display = memo(({ count }) => {
  return <div>Count: {count}</div>;
});

// Best approach:
// ├─ Props for frequently updating data
// ├─ React.memo for expensive components
// ├─ Clear data flow
// └─ Optimal performance
```

────────────────────────────────────────────────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────────────────────────────────────────────────

### The 30-Second Answer

**Senior Engineer Response (7+ years):**

> "Prop drilling is passing data through intermediate components that don't use the data themselves, which becomes painful beyond 3-4 levels. Context solves this by allowing components to access data directly without drilling, but it has a critical performance caveat: all consumers re-render when the context value changes, regardless of what part of the value they use. In practice, I use props for 80% of data flow—it's explicit, type-safe, and performs well. Context is reserved for truly global, infrequently changing data like theme, auth, and locale. For frequently updating data, props with React.memo outperform context. The key decision point is the depth-times-frequency product: shallow depth or high frequency means props; deep nesting with rare changes means context. I've seen teams over-use context and create performance nightmares—measuring with React Profiler is essential."

### Interview Deep-Dive Questions & Answers

**Question 1: "When would you choose Context over prop drilling?"**

```
Strong Answer:

"I evaluate three factors: depth, frequency, and scope.

**DEPTH: How many levels?**

1-2 levels → Props
├─ Not painful to pass props
├─ Explicit data flow is valuable
├─ Easy to understand and maintain
└─ No need for context

3-4 levels → Consider Context
├─ Prop drilling becoming tedious
├─ Adding fields touches multiple files
├─ May be worth context investment
└─ Depends on other factors

5+ levels → Context or Redux
├─ Prop drilling is very painful
├─ Intermediate components polluted
├─ Hard to maintain
└─ Context or global state needed

**FREQUENCY: How often does data change?**

High (10+ times/minute) → Props
├─ Every keystroke, animations
├─ Context would re-render all consumers
├─ Props perform better
└─ Example: Form inputs

Medium (1-10 times/minute) → Either
├─ Depends on other factors
├─ Performance acceptable either way
└─ Choose based on depth and scope

Low (< 1 time/minute) → Context
├─ Theme changes, language switches
├─ Re-renders acceptable
├─ Ergonomics more important than performance
└─ Example: Theme, locale, auth

**SCOPE: How many components need data?**

Few (2-3) → Props
├─ Not worth context overhead
├─ Simple prop passing sufficient
└─ Keep it simple

Many (5+) unrelated → Context
├─ Scattered across tree
├─ Hard to pass via props
├─ Context provides clean access
└─ Example: Auth, theme

**Real Example Decision:**

Theme system:
├─ Depth: Used at all levels (10+)
├─ Frequency: Changes once per session (low)
├─ Scope: Needed by 50+ components
├─ Verdict: Context ✅

Form state:
├─ Depth: 2-3 levels
├─ Frequency: Every keystroke (high)
├─ Scope: Form-specific (3-5 components)
├─ Verdict: Props ✅

Shopping cart:
├─ Depth: Many levels
├─ Frequency: Medium (add/remove items)
├─ Scope: Many components (cart badge, checkout, etc.)
├─ Verdict: Redux/Zustand (more than context)

**The Formula:**

If (depth > 3 AND frequency < 1/min AND scope > 5)
  → Use Context
Else if (complex state + many components)
  → Use Redux/Zustand
Else
  → Use Props

This keeps code simple by default and upgrades only when necessary."
```

**Question 2: "What are the performance implications of Context?"**

```
Strong Answer:

"Context has a critical performance characteristic: when the provider's
value changes, ALL consumers re-render, even if they only use part of
the value. There's no built-in selector mechanism.

**The Problem:**

const AppContext = createContext();

function App() {
  const [user, setUser] = useState({ name: 'John' });
  const [theme, setTheme] = useState('light');
  
  const value = { user, theme }; // ⚠️ New object every render!
  
  return (
    <AppContext.Provider value={value}>
      <Header />    {/* Uses theme */}
      <Content />   {/* Uses user */}
    </AppContext.Provider>
  );
}

function Header() {
  const { theme } = useContext(AppContext);
  return <header className={theme}>...</header>;
}

function Content() {
  const { user } = useContext(AppContext);
  return <div>Welcome, {user.name}</div>;
}

Problems:
1. **New object reference every App render**
   ├─ Even if user and theme didn't change
   ├─ Context compares value with ===
   ├─ New object !== old object
   └─ ALL consumers re-render unnecessarily

2. **No selective subscriptions**
   ├─ Header only uses theme
   ├─ But re-renders when user changes
   ├─ Content only uses user
   └─ But re-renders when theme changes

**Solution 1: Memoize value**

const value = useMemo(
  () => ({ user, theme }),
  [user, theme]
);

Benefits:
├─ Same object returned if user, theme unchanged
├─ Prevents unnecessary re-renders
└─ Essential for performance

**Solution 2: Split contexts**

<UserContext.Provider value={user}>
  <ThemeContext.Provider value={theme}>
    <Header />    {/* Only subscribes to ThemeContext */}
    <Content />   {/* Only subscribes to UserContext */}
  </ThemeContext.Provider>
</UserContext.Provider>

Benefits:
├─ Theme change → only Header re-renders
├─ User change → only Content re-renders
├─ Optimal performance ✅
└─ Industry best practice

**Solution 3: Use Zustand for selective subscriptions**

const useStore = create((set) => ({
  user: { name: 'John' },
  theme: 'light',
  setUser: (user) => set({ user }),
  setTheme: (theme) => set({ theme })
}));

function Header() {
  const theme = useStore(state => state.theme);
  // Only re-renders when theme changes ✅
}

function Content() {
  const user = useStore(state => state.user);
  // Only re-renders when user changes ✅
}

**Performance Comparison:**

Scenario: App with 20 context consumers, theme change

Context (naive):
├─ 20 components re-render
├─ Time: ~50ms
├─ Wasted renders: 15 (75%)
└─ Jank if components are expensive

Context (split):
├─ 5 theme consumers re-render
├─ Time: ~15ms
├─ Wasted renders: 0
└─ Optimal ✅

Zustand:
├─ 5 theme subscribers re-render
├─ Time: ~10ms
├─ Wasted renders: 0
└─ Slightly faster than context

**Real-World Impact:**

At [Company], we had performance issues:
├─ Before: Single context for all app state
├─ Problem: 50+ re-renders on any state change
├─ UI was janky, users complained
├─ Solution: Split into 5 contexts (auth, theme, user, cart, notifications)
├─ After: 5-10 re-renders per change
├─ Result: Smooth 60 FPS, +30% user satisfaction

**Key Takeaway:**
Context performance is about reference equality and selectivity.
Memoize values and split contexts by concern to avoid problems."
```

**Question 3: "How do you handle testing components that use Context?"**

```
Strong Answer:

"Testing context consumers requires providing the context value in tests,
which adds setup complexity compared to prop-based components.

**Prop-Based Component (Easy to Test):**

function UserMenu({ user, onLogout }) {
  return (
    <div>
      <span>{user.name}</span>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}

// Test: Simple and clean
test('renders user name', () => {
  const user = { name: 'John Doe' };
  render(<UserMenu user={user} onLogout={jest.fn()} />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});

**Context-Based Component (More Setup):**

function UserMenu() {
  const { user, logout } = useAuth();
  return (
    <div>
      <span>{user.name}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

// Test: Requires context wrapper
test('renders user name', () => {
  const user = { name: 'John Doe' };
  const logout = jest.fn();
  
  render(
    <AuthContext.Provider value={{ user, logout }}>
      <UserMenu />
    </AuthContext.Provider>
  );
  
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});

**Solution: Create Test Utilities**

// test-utils.tsx
function renderWithAuth(ui, { user, ...options } = {}) {
  const defaultUser = { name: 'Test User', id: '123' };
  const mockLogout = jest.fn();
  
  return render(
    <AuthContext.Provider value={{ 
      user: user || defaultUser,
      logout: mockLogout,
      isAuthenticated: true
    }}>
      {ui}
    </AuthContext.Provider>,
    options
  );
}

// Test becomes cleaner
test('renders user name', () => {
  renderWithAuth(<UserMenu />, { 
    user: { name: 'John Doe' } 
  });
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});

**Multi-Context Testing:**

function renderWithProviders(
  ui,
  {
    authValue,
    themeValue,
    ...options
  } = {}
) {
  const defaultAuth = { user: null, isAuthenticated: false };
  const defaultTheme = { theme: 'light', toggleTheme: jest.fn() };
  
  return render(
    <AuthProvider value={authValue || defaultAuth}>
      <ThemeProvider value={themeValue || defaultTheme}>
        {ui}
      </ThemeProvider>
    </AuthProvider>,
    options
  );
}

**Pros and Cons:**

Props (Testing):
✅ No wrapper needed
✅ Fast to write tests
✅ Explicit dependencies
✅ Easy to mock
❌ Requires passing all props

Context (Testing):
❌ Requires provider wrapper
❌ More setup code
❌ Hidden dependencies
✅ Don't need to pass props in tests
✅ Tests real integration

**Best Practice:**

1. **Create test utilities** for common contexts
2. **Test context providers separately** from consumers
3. **Test consumer logic** with mocked context
4. **Integration tests** use real providers
5. **Unit tests** use test utilities

Example structure:
├─ Unit tests: Mock context with test utilities
├─ Integration tests: Real providers
└─ E2E tests: Full app with real context

**At [Company]:**
├─ We created `renderWithApp()` utility
├─ Wraps all app contexts with sensible defaults
├─ Developers can override specific values
├─ Reduced test setup by 70%
└─ Tests are much more readable"
```

**Question 4: "Can you explain the difference between Context and Redux?"**

```
Strong Answer:

"Context and Redux solve similar problems but with different trade-offs.

**Context: Built-in State Distribution**
┌────────────────────────────────────────────┐
│ What it is:                                │
│ ├─ React's built-in mechanism             │
│ ├─ Distributes values down tree           │
│ ├─ No external dependencies               │
│ └─ Simple provider/consumer API           │
│                                            │
│ Best for:                                  │
│ ├─ Simple value distribution              │
│ ├─ Infrequently changing data             │
│ ├─ Small to medium apps                   │
│ └─ Theme, locale, auth                    │
│                                            │
│ Limitations:                               │
│ ├─ All consumers re-render                │
│ ├─ No built-in selectors                  │
│ ├─ No middleware                           │
│ ├─ No devtools                            │
│ └─ Can't easily split updates             │
└────────────────────────────────────────────┘

**Redux: Structured State Management**
┌────────────────────────────────────────────┐
│ What it is:                                │
│ ├─ External state management library      │
│ ├─ Structured actions/reducers pattern    │
│ ├─ Middleware support                     │
│ └─ Rich ecosystem                         │
│                                            │
│ Best for:                                  │
│ ├─ Complex state logic                    │
│ ├─ Multiple related state pieces          │
│ ├─ Large apps                             │
│ ├─ Need middleware (logging, analytics)   │
│ └─ Time-travel debugging                  │
│                                            │
│ Advantages over Context:                   │
│ ├─ Selector-based subscriptions (optimized)│
│ ├─ Redux DevTools (essential for debugging)│
│ ├─ Middleware (side effects, logging)     │
│ ├─ Clear patterns (actions, reducers)     │
│ └─ Normalized state helpers               │
└────────────────────────────────────────────┘

**When to Choose:**

Start with Context if:
├─ Small to medium app
├─ Simple state (theme, auth)
├─ Infrequent updates
├─ Team unfamiliar with Redux
└─ Want minimal dependencies

Upgrade to Redux when:
├─ Context causing performance issues
├─ Need middleware (auth token refresh, logging)
├─ Complex state with many inter-dependencies
├─ Team wants DevTools for debugging
└─ App growing to 50+ components

**Real Example:**

App evolution:
Phase 1 (Small app):
├─ Theme: Context ✅
├─ Auth: Context ✅
└─ Works great

Phase 2 (Growing):
├─ Theme: Context ✅
├─ Auth: Context ✅
├─ Cart: Context... starting to struggle
└─ 20 components, perf issues appearing

Phase 3 (Large app):
├─ Theme: Context ✅ (still good)
├─ Auth: Moved to Redux (complex auth flows)
├─ Cart: Moved to Redux (needed middleware)
├─ User preferences: Redux (normalized state)
└─ 100+ components, Redux DevTools essential

**Key Insight:**
Context and Redux aren't either/or. Use both:
├─ Context: Theme, locale (simple, rare changes)
├─ Redux: Complex state (cart, user, notifications)
└─ Best tool for each job"
```

**Question 5: "How would you refactor prop drilling into Context?"**

```
Strong Answer:

"I follow a systematic approach to minimize risk:

**Step 1: Identify the Prop Drilling**

Before:
<App>
  <Dashboard user={user}>
    <Sidebar user={user}>
      <Navigation user={user}>
        <UserMenu user={user}>

Analysis:
├─ 'user' drilled through 4 levels
├─ 3 intermediate components don't use it
├─ Adding user field = update 4 components
└─ Clear candidate for context

**Step 2: Create Context (with TypeScript)**

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}

**Step 3: Create Provider Component**

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  // Memoize value to prevent unnecessary re-renders
  const value = useMemo(() => ({ user, setUser }), [user]);
  
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

**Step 4: Wrap App with Provider**

function App() {
  return (
    <UserProvider>
      <Dashboard />
    </UserProvider>
  );
}

**Step 5: Update Consumers (Bottom-Up)**

// Start with the component that actually uses user
function UserMenu() {
  // Before: function UserMenu({ user }) {
  const { user } = useUser(); // After
  
  return (
    <div>
      <img src={user.avatar} />
      <span>{user.name}</span>
    </div>
  );
}

**Step 6: Remove Props from Intermediates**

// Navigation no longer needs user prop
function Navigation() {
  // Before: function Navigation({ user }) {
  return (
    <nav>
      <UserMenu />
      {/* No more user={user} prop */}
    </nav>
  );
}

// Sidebar no longer needs user prop
function Sidebar() {
  // Before: function Sidebar({ user }) {
  return (
    <aside>
      <Navigation />
      {/* No more user={user} prop */}
    </aside>
  );
}

// Dashboard no longer needs user prop
function Dashboard() {
  // Before: function Dashboard({ user }) {
  return (
    <div>
      <Sidebar />
      {/* No more user={user} prop */}
    </div>
  );
}

**Step 7: Update Tests**

// Create test utility
function renderWithUser(ui, { user = mockUser } = {}) {
  return render(
    <UserProvider value={{ user, setUser: jest.fn() }}>
      {ui}
    </UserProvider>
  );
}

// Update tests
test('UserMenu renders user name', () => {
  renderWithUser(<UserMenu />, { 
    user: { name: 'John' } 
  });
  expect(screen.getByText('John')).toBeInTheDocument();
});

**Step 8: Verify Performance**

// Use React DevTools Profiler
// Check that:
├─ Only consuming components re-render on user change
├─ Intermediate components don't re-render
└─ No unexpected re-renders

**Migration Strategy:**

1. **Gradual migration**
   ├─ Don't change everything at once
   ├─ Migrate one context at a time
   └─ Keep app working at each step

2. **Feature flags**
   ├─ Use feature flag to toggle context
   ├─ Test in production with small %
   └─ Roll back if issues

3. **Metrics**
   ├─ Measure re-renders before/after
   ├─ Check performance metrics
   └─ Monitor error rates

**Rollback Plan:**

If context causes issues:
├─ Keep prop drilling version in git
├─ Can revert quickly
├─ Learn from issues
└─ Try again with fixes

**At [Company]:**
├─ Migrated auth from props to context
├─ Took 2 weeks (careful, tested approach)
├─ Removed 500 lines of prop passing
├─ No performance issues
└─ Team velocity increased"
```

────────────────────────────────────────────────────────────────────────────────
## 5. Code Examples & Implementation
────────────────────────────────────────────────────────────────────────────────

### Example 1: Basic Context Implementation

**Complete context setup with TypeScript:**

```typescript
// contexts/ThemeContext.tsx
import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect,
  useMemo,
  ReactNode 
} from 'react';

// 1. Define types
type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark'; // Resolved theme (system -> light/dark)
  setTheme: (theme: Theme) => void;
}

// 2. Create context with undefined default
//    (forces usage within provider)
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 3. Create provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage or default
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme;
    if (stored) return stored;
    return 'system';
  });
  
  // Resolve 'system' to actual theme
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
    }
    return theme;
  });
  
  // Listen to system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setActualTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
  
  // Update actual theme when theme changes
  useEffect(() => {
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setActualTheme(isDark ? 'dark' : 'light');
    } else {
      setActualTheme(theme);
    }
  }, [theme]);
  
  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', actualTheme);
    localStorage.setItem('theme', theme);
  }, [theme, actualTheme]);
  
  // Memoize value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({ theme, actualTheme, setTheme }),
    [theme, actualTheme]
  );
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// 4. Create custom hook for easy usage
export function useTheme() {
  const context = useContext(ThemeContext);
  
  // Provide helpful error message if used outside provider
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  
  return context;
}

// 5. Optional: Create selector hooks for specific values
export function useActualTheme() {
  const { actualTheme } = useTheme();
  return actualTheme;
}

// Usage in App
function App() {
  return (
    <ThemeProvider>
      <Header />
      <MainContent />
      <Footer />
    </ThemeProvider>
  );
}

// Usage in components
function Header() {
  const { theme, setTheme } = useTheme();
  
  return (
    <header>
      <Logo />
      <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </header>
  );
}

function Article() {
  const actualTheme = useActualTheme(); // Only subscribes to actualTheme
  
  return (
    <article className={`article article--${actualTheme}`}>
      {/* Content */}
    </article>
  );
}
```

### Example 2: Optimized Context with Split Providers

**Preventing unnecessary re-renders:**

```typescript
// ❌ BAD: Single context with multiple values
interface AppContextType {
  user: User | null;
  theme: Theme;
  locale: Locale;
  notifications: Notification[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Problem: Any change re-renders ALL consumers

// ✅ GOOD: Split contexts by concern
// contexts/UserContext.tsx
interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    setUser(data.user);
  };
  
  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };
  
  const value = useMemo(
    () => ({ user, setUser, login, logout }),
    [user]
  );
  
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}

// contexts/ThemeContext.tsx (separate)
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Theme logic...
}

// contexts/NotificationsContext.tsx (separate)
export function NotificationsProvider({ children }: { children: ReactNode }) {
  // Notifications logic...
}

// App.tsx: Compose providers
function App() {
  return (
    <UserProvider>
      <ThemeProvider>
        <NotificationsProvider>
          <Router>
            <Routes />
          </Router>
        </NotificationsProvider>
      </ThemeProvider>
    </UserProvider>
  );
}

// Better: Create AppProviders component
function AppProviders({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <ThemeProvider>
        <NotificationsProvider>
          {children}
        </NotificationsProvider>
      </ThemeProvider>
    </UserProvider>
  );
}

function App() {
  return (
    <AppProviders>
      <Router>
        <Routes />
      </Router>
    </AppProviders>
  );
}

// Now components can use specific contexts:

function UserMenu() {
  const { user, logout } = useUser(); // Only re-renders on user changes
  // Doesn't re-render when theme or notifications change!
  
  return (
    <div>
      <span>{user?.name}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme(); // Only re-renders on theme changes
  // Doesn't re-render when user or notifications change!
  
  return (
    <button onClick={toggleTheme}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

### Example 3: Context with Reducer Pattern

**For more complex state logic:**

```typescript
// contexts/CartContext.tsx
import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useMemo 
} from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  total: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' };

// Reducer for complex state logic
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(
        item => item.id === action.payload.id
      );
      
      let newItems: CartItem[];
      
      if (existingItem) {
        newItems = state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [...state.items, { ...action.payload, quantity: 1 }];
      }
      
      const total = newItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      
      return { items: newItems, total };
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload);
      const total = newItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      return { items: newItems, total };
    }
    
    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      const total = newItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      return { items: newItems, total };
    }
    
    case 'CLEAR_CART':
      return { items: [], total: 0 };
    
    default:
      return state;
  }
}

interface CartContextType {
  state: CartState;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    total: 0
  });
  
  // Action creators
  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };
  
  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  };
  
  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };
  
  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };
  
  // Memoize value
  const value = useMemo(
    () => ({ state, addItem, removeItem, updateQuantity, clearCart }),
    [state]
  );
  
  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

// Usage
function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  
  return (
    <div>
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={() => addItem(product)}>
        Add to Cart
      </button>
    </div>
  );
}

function CartBadge() {
  const { state } = useCart();
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  
  return (
    <div className="cart-badge">
      🛒 {itemCount}
    </div>
  );
}

function CartPage() {
  const { state, removeItem, updateQuantity, clearCart } = useCart();
  
  return (
    <div>
      <h1>Shopping Cart</h1>
      
      {state.items.map(item => (
        <div key={item.id}>
          <span>{item.name}</span>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
          />
          <span>${item.price * item.quantity}</span>
          <button onClick={() => removeItem(item.id)}>Remove</button>
        </div>
      ))}
      
      <div>
        <strong>Total: ${state.total.toFixed(2)}</strong>
      </div>
      
      <button onClick={clearCart}>Clear Cart</button>
    </div>
  );
}
```

### Example 4: Testing Context-Based Components

**Comprehensive testing approach:**

```typescript
// test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider } from './contexts/UserContext';
import { CartProvider } from './contexts/CartContext';

// Create custom render with all providers
interface AllProvidersProps {
  children: React.ReactNode;
  themeValue?: any;
  userValue?: any;
  cartValue?: any;
}

function AllProviders({ 
  children,
  themeValue,
  userValue,
  cartValue 
}: AllProvidersProps) {
  return (
    <ThemeProvider {...themeValue}>
      <UserProvider {...userValue}>
        <CartProvider {...cartValue}>
          {children}
        </CartProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  themeValue?: any;
  userValue?: any;
  cartValue?: any;
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { themeValue, userValue, cartValue, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders
        themeValue={themeValue}
        userValue={userValue}
        cartValue={cartValue}
      >
        {children}
      </AllProviders>
    ),
    ...renderOptions
  });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// UserMenu.test.tsx
import { render, screen, fireEvent } from './test-utils';
import UserMenu from './UserMenu';

describe('UserMenu', () => {
  it('renders user name', () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' };
    
    render(<UserMenu />, {
      userValue: {
        user: mockUser,
        logout: jest.fn()
      }
    });
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
  
  it('calls logout when button clicked', () => {
    const mockLogout = jest.fn();
    const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' };
    
    render(<UserMenu />, {
      userValue: {
        user: mockUser,
        logout: mockLogout
      }
    });
    
    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
  
  it('does not render when user is null', () => {
    render(<UserMenu />, {
      userValue: {
        user: null,
        logout: jest.fn()
      }
    });
    
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });
});

// Testing context provider itself
import { renderHook, act } from '@testing-library/react';
import { UserProvider, useUser } from './contexts/UserContext';

describe('UserContext', () => {
  it('provides initial user as null', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider
    });
    
    expect(result.current.user).toBeNull();
  });
  
  it('updates user when setUser is called', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider
    });
    
    const newUser = { id: '1', name: 'John', email: 'john@example.com' };
    
    act(() => {
      result.current.setUser(newUser);
    });
    
    expect(result.current.user).toEqual(newUser);
  });
  
  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useUser());
    }).toThrow('useUser must be used within UserProvider');
    
    spy.mockRestore();
  });
});
```

### Example 5: Migration from Props to Context

**Step-by-step refactoring:**

```typescript
// BEFORE: Prop drilling
function App() {
  const [user, setUser] = useState(null);
  
  return <Dashboard user={user} setUser={setUser} />;
}

function Dashboard({ user, setUser }) {
  return (
    <div>
      <Sidebar user={user} setUser={setUser} />
      <Content user={user} />
    </div>
  );
}

function Sidebar({ user, setUser }) {
  return (
    <aside>
      <Navigation user={user} setUser={setUser} />
    </aside>
  );
}

function Navigation({ user, setUser }) {
  return (
    <nav>
      <UserMenu user={user} setUser={setUser} />
    </nav>
  );
}

function UserMenu({ user, setUser }) {
  return (
    <div>
      <span>{user?.name}</span>
      <button onClick={() => setUser(null)}>Logout</button>
    </div>
  );
}

// AFTER: Context
// 1. Create context
const UserContext = createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
} | undefined>(undefined);

function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  const value = useMemo(() => ({ user, setUser }), [user]);
  
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}

// 2. Update App
function App() {
  return (
    <UserProvider>
      <Dashboard />
    </UserProvider>
  );
}

// 3. Clean up intermediate components (no more props!)
function Dashboard() {
  return (
    <div>
      <Sidebar />
      <Content />
    </div>
  );
}

function Sidebar() {
  return (
    <aside>
      <Navigation />
    </aside>
  );
}

function Navigation() {
  return (
    <nav>
      <UserMenu />
    </nav>
  );
}

// 4. Update consumer
function UserMenu() {
  const { user, setUser } = useUser();
  
  return (
    <div>
      <span>{user?.name}</span>
      <button onClick={() => setUser(null)}>Logout</button>
    </div>
  );
}

// Results:
// ├─ 3 components simplified (Dashboard, Sidebar, Navigation)
// ├─ No more prop passing through intermediate layers
// ├─ Easy to add user access to any component
// └─ Cleaner, more maintainable code ✅
```

────────────────────────────────────────────────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────────────────────────────────────────────────

### Why This Matters

**1. Code Maintainability:**

```
Impact on Long-term Maintenance:

Prop Drilling (Bad at Scale):
┌────────────────────────────────────────────┐
│ Task: Add new user field (avatar)          │
│                                            │
│ Files to modify: 6                         │
│ ├─ App.tsx (add to state)                 │
│ ├─ Dashboard.tsx (pass through)           │
│ ├─ Sidebar.tsx (pass through)             │
│ ├─ Navigation.tsx (pass through)          │
│ ├─ UserMenu.tsx (use it)                  │
│ └─ Types.ts (update interface)            │
│                                            │
│ Time: 30-60 minutes                        │
│ Risk: High (multiple files)                │
│ Testing: 6 components affected             │
└────────────────────────────────────────────┘

Context (Good at Scale):
┌────────────────────────────────────────────┐
│ Task: Add new user field (avatar)          │
│                                            │
│ Files to modify: 2                         │
│ ├─ UserContext.tsx (add to type/state)    │
│ └─ UserMenu.tsx (use it)                  │
│                                            │
│ Time: 5-10 minutes                         │
│ Risk: Low (isolated changes)               │
│ Testing: 2 components affected             │
└────────────────────────────────────────────┘

Result: 6× faster development with context
```

**2. Team Productivity:**

```
Real Metrics from [Company]:

Before Context (Prop Drilling):
├─ Average feature time: 3 days
├─ Bug rate: 15% (from prop passing errors)
├─ Onboarding time: 2 weeks
├─ Developer satisfaction: 6/10
└─ Code review time: 45 minutes

After Context Migration:
├─ Average feature time: 1.5 days (2× faster)
├─ Bug rate: 5% (fewer prop errors)
├─ Onboarding time: 1 week (clearer code)
├─ Developer satisfaction: 8/10
└─ Code review time: 25 minutes

Business Impact:
├─ Velocity increase: 2×
├─ Cost reduction: 30%
├─ Feature delivery: 50% faster
└─ ROI: Positive after 2 months
```

**3. User Experience:**

```
Performance Impact on Users:

Scenario: Theme change in app with 50 components

Prop Drilling:
├─ Must pass theme through all 50 components
├─ Theme change triggers top-level re-render
├─ All 50 components re-render (props changed)
├─ Time: ~100ms (noticeable lag)
└─ User experience: Slight delay

Context (Naive):
├─ All context consumers re-render
├─ If all 50 components consume context
├─ Time: ~100ms (same as props)
└─ User experience: Same

Context (Optimized):
├─ Only 20 components actually use theme
├─ Split ThemeContext from other contexts
├─ Only 20 components re-render
├─ Time: ~40ms (imperceptible)
└─ User experience: Instant ✅

Key Insight:
Proper context usage improves UX by enabling:
├─ Consistent state across app
├─ Fast updates to relevant components
├─ No prop passing overhead
└─ Better performance when optimized
```

### How It Works (Complete Flow)

**The Context Mechanism:**

```
CONTEXT CREATION & USAGE:

1. CREATE CONTEXT
   ↓
   const UserContext = React.createContext(defaultValue);
   ↓
   React creates internal context object:
   {
     id: unique_identifier,
     Provider: ProviderComponent,
     Consumer: ConsumerComponent,
     _currentValue: defaultValue,
     _subscribers: Set()
   }

2. PROVIDE VALUE
   ↓
   <UserContext.Provider value={user}>
     <App />
   </UserContext.Provider>
   ↓
   During render:
   ├─ React creates Provider fiber node
   ├─ Stores value in fiber node
   ├─ Registers context in fiber tree
   └─ All children can now access value

3. CONSUME VALUE
   ↓
   const user = useContext(UserContext);
   ↓
   During component render:
   ├─ React looks up fiber tree for nearest Provider
   ├─ Reads value from Provider's fiber node
   ├─ Subscribes component to Provider
   └─ Returns value

4. VALUE CHANGES
   ↓
   setUser(newUser);
   ↓
   Provider re-renders:
   ├─ New value stored in fiber node
   ├─ React compares: newValue !== oldValue (===)
   ├─ If different, notifies all subscribers
   └─ Subscribers schedule re-render

5. RE-RENDER PHASE
   ↓
   React reconciliation:
   ├─ Provider re-renders
   ├─ Walks fiber tree depth-first
   ├─ Finds subscribed components
   ├─ Marks them for re-render
   ├─ Even if parent memoized! (Context bypasses memo)
   └─ All subscribers re-render

Performance Characteristics:
├─ Provider update: O(1)
├─ Finding subscribers: O(n) where n = components in tree
├─ Re-rendering subscribers: O(m) where m = subscribed components
└─ Total: O(n + m)

Why This Matters:
├─ Context is NOT free performance-wise
├─ All subscribers re-render (no selectivity)
├─ Must optimize with split contexts
└─ Understanding mechanism helps optimize
```

**Props vs Context Comparison:**

```
PROP DRILLING FLOW:

<App>                          Component renders
  ↓                           Props object created
  render <Child props={...}>   Props passed to Child
  ↓                           Child receives props
  Child renders                Props in scope
  ↓                           Pass to next level
  render <GrandChild props={...}>
  ↓
  GrandChild uses props        Finally consumed

Characteristics:
├─ Explicit data flow (can trace)
├─ Type-safe at each level
├─ Parent re-render → children re-render
└─ React.memo can optimize

CONTEXT FLOW:

<Provider value={...}>         Value stored in fiber node
  ↓
  <App>                        App renders
    ↓
    <Child>                    Child renders (no props)
      ↓
      useContext(Context)      Looks up fiber tree
                ↑             Finds Provider
                |             Reads value
                └─────────────┘ Direct access!

Characteristics:
├─ Implicit data flow (magical)
├─ Type-safe at provider/consumer
├─ Provider re-render → consumers re-render
└─ React.memo CANNOT prevent (context bypasses)

Key Difference:
Props: Explicit, traceable, optimizable
Context: Implicit, convenient, harder to optimize
```

### Decision Framework (Final)

**The Complete Decision Tree:**

```
WHEN TO USE WHAT:

START: Need to pass data to component
         ↓
Q1: Is data needed in multiple places?
    ├─ NO → useState in component ✅
    └─ YES → Continue

Q2: How deep is the component tree?
    ├─ 1 level → Props ✅
    ├─ 2 levels → Props ✅
    ├─ 3-4 levels → Consider Context (evaluate frequency)
    └─ 5+ levels → Context or Redux ✅

Q3: How frequently does data change?
    ├─ Very High (10+ /min) → Props + React.memo ✅
    ├─ Medium (1-10 /min) → Context (with optimization) ✅
    └─ Low (< 1 /min) → Context ✅

Q4: How many components need data?
    ├─ 2-3 components → Props ✅
    ├─ 4-10 components → Context ✅
    └─ 10+ components → Context or Redux ✅

Q5: Is this truly global data?
    ├─ YES (auth, theme, locale) → Context ✅
    ├─ NO (form state, modal state) → Props or Local State ✅
    └─ COMPLEX (cart, notifications) → Redux/Zustand ✅

Q6: Is this server data?
    └─ YES → React Query (not Context!) ✅

SPECIAL CASES:

Theme/Locale:
├─ Always use Context
├─ Affects entire app
├─ Changes very rarely
└─ Perfect fit ✅

Authentication:
├─ Small app → Context ✅
├─ Complex auth → Redux ✅
├─ SSO/OAuth → Redux ✅

Form State:
├─ Simple form → Props ✅
├─ Multi-step → Props + lift state ✅
├─ Complex validation → React Hook Form ✅
└─ Never Context (too frequent updates) ❌

Shopping Cart:
├─ Small store → Context (acceptable)
├─ Large store → Redux/Zustand ✅
├─ Reason: Middleware, persistence, devtools

API Data:
├─ Never in Context ❌
├─ Use React Query ✅
├─ Reason: Caching, refetching, optimistic updates
```

### Best Practices (Industry Standard)

**The Golden Rules:**

```
1. START WITH PROPS
   ├─ Default to explicit prop passing
   ├─ Only upgrade when painful
   ├─ Measure pain: depth × frequency × scope
   └─ Don't over-engineer from day 1

2. SPLIT CONTEXTS BY CONCERN
   ├─ Theme: ThemeContext
   ├─ Auth: AuthContext  
   ├─ Locale: LocaleContext
   ├─ NEVER: AppContext with everything ❌
   └─ Reason: Prevents unnecessary re-renders

3. ALWAYS MEMOIZE CONTEXT VALUES
   const value = useMemo(
     () => ({ user, setUser }),
     [user]
   );
   ├─ Prevents re-renders on unrelated changes
   ├─ CRITICAL for performance
   └─ Easy to forget, always do it

4. CREATE CUSTOM HOOKS
   export function useUser() {
     const context = useContext(UserContext);
     if (!context) throw new Error(...);
     return context;
   }
   ├─ Better error messages
   ├─ Enforces provider usage
   ├─ Cleaner consumer code
   └─ Can add logic/validation

5. USE TYPESCRIPT
   interface UserContextType {
     user: User | null;
     setUser: (user: User | null) => void;
   }
   ├─ Type safety at provider/consumer
   ├─ Autocomplete in IDE
   ├─ Catches errors at compile time
   └─ Self-documenting

6. TEST WITH UTILITIES
   function renderWithProviders(ui, options) {
     return render(
       <AllProviders {...options}>
         {ui}
       </AllProviders>
     );
   }
   ├─ Reusable test setup
   ├─ Consistent provider configuration
   ├─ Easy to mock values
   └─ Faster test writing

7. MEASURE PERFORMANCE
   ├─ Use React DevTools Profiler
   ├─ Check re-render counts
   ├─ Identify unnecessary re-renders
   ├─ Optimize with split contexts
   └─ Monitor after changes

8. NEVER USE CONTEXT FOR:
   ├─ High-frequency updates (forms, animations)
   ├─ Server state (API responses)
   ├─ URL state (routing)
   └─ Component-specific state

9. DOCUMENT DECISIONS
   ├─ Why this context exists
   ├─ What data it contains
   ├─ When to use it
   └─ Migration guide for team

10. GRADUAL MIGRATION
    ├─ Don't refactor everything at once
    ├─ Start with most painful prop drilling
    ├─ Measure impact
    ├─ Roll out gradually
    └─ Have rollback plan
```

### The Bottom Line

**In One Sentence:**

> "Prop drilling is the explicit pattern of passing data through intermediate components that don't use the data, which becomes unmaintainable beyond 3-4 levels, while Context provides implicit access to data anywhere in the tree at the cost of all consumers re-rendering when the value changes—use props by default for explicit, type-safe, performant data flow (80% of cases), and upgrade to Context only for truly global, infrequently changing data like theme, authentication, and locale that's needed by many unrelated components at various depths (15% of cases), while complex shared state should use Redux or Zustand for better performance and developer tooling (5% of cases)."

**Interview Summary (20 seconds):**

> "Prop drilling passes data through components that don't use it, becoming painful after 3-4 levels. Context solves this with implicit access but re-renders all consumers when the value changes. I use props for 80% of data flow—it's explicit and performant—and Context for infrequent, global data like theme and auth. The key decision factors are depth (3+ levels), frequency (< 1 change/minute), and scope (5+ components). Always memoize context values and split contexts by concern to avoid performance issues. I've seen teams over-use context and create performance nightmares by putting form state and frequently updating data in context instead of props."

**Key Principles:**

```
1. **Props by Default**
   └─ Explicit, type-safe, performant (80% of cases)

2. **Context for Global**
   └─ Deep nesting + rare changes + many consumers

3. **Split by Concern**
   └─ Theme, Auth, Locale in separate contexts

4. **Memoize Values**
   └─ Critical for preventing unnecessary re-renders

5. **Measure Performance**
   └─ React Profiler to identify issues

6. **Wrong Tool for High-Frequency**
   └─ Forms, animations → use props instead

7. **Server State → React Query**
   └─ Not Context or Redux

8. **Test with Utilities**
   └─ Reusable provider wrappers
```

────────────────────────────────────────────────────────────────────────────────

**🎯 Key Interview Points:**

1. **Definition**: Prop drilling = passing through components that don't use data
2. **Problem**: Painful beyond 3-4 levels, tight coupling, maintenance burden
3. **Solution**: Context provides implicit access anywhere in tree
4. **Trade-off**: All consumers re-render when value changes
5. **Decision**: Depth (3+) × Frequency (low) × Scope (5+) = Context
6. **Optimization**: Memoize values, split contexts, measure with Profiler
7. **Best Practice**: Props 80%, Context 15%, Redux 5%
8. **Anti-patterns**: Context for forms, high-frequency updates, server state

**📊 Expected FAANG Follow-ups:**

- "When would you choose Context over prop drilling?"
- "What are the performance implications of Context?"
- "How do you handle testing components that use Context?"
- "Can you explain the difference between Context and Redux?"
- "How would you refactor prop drilling into Context?"
- "What's the biggest mistake teams make with Context?"
- "How do you optimize Context performance?"
- "When would you use props instead of Context?"

────────────────────────────────────────────────────────────────────────────────

**Status**: ✅ Complete | **Depth**: Senior/Staff Level | **Interview-Ready**: Yes

**Last Updated**: January 21, 2026
