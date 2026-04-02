# Rules of Hooks

## 1️⃣ High-Level Explanation (Interview Framing)

The **Rules of Hooks** are strict constraints that React enforces to ensure hooks work correctly. There are two fundamental rules:

### The Two Rules

**Rule #1: Only Call Hooks at the Top Level**
- Don't call hooks inside loops, conditions, or nested functions
- Hooks must be called in the same order on every render

**Rule #2: Only Call Hooks from React Functions**
- Call hooks from React function components
- Call hooks from custom hooks
- Don't call hooks from regular JavaScript functions

### What They Are
Hooks are **order-dependent** functions that React tracks using an internal linked list. Each hook call corresponds to a position in this list. Breaking the rules corrupts this list, causing bugs.

### Why They Exist
React's hooks implementation relies on:
1. **Call order consistency** - React uses position to match hook calls across renders
2. **Component context** - Hooks need access to the current component's fiber node
3. **State persistence** - React stores hook state in the fiber, indexed by call order

Without these rules, React can't:
- Preserve state across renders
- Track which effect to run
- Associate hook calls with the correct component

### The Problem They Solve

**Before Hooks (Class Components):**
- State and lifecycle were tied to component instances
- `this.state` was an object, order didn't matter
- Lifecycle methods were explicit (componentDidMount, etc.)

**With Hooks (Function Components):**
- No component instance (function is called each render)
- State must be stored externally (in fiber node)
- React uses **call order** to maintain state consistency

**What Breaks Without Rules:**
```jsx
// ❌ WRONG: Conditional hook
function BadComponent({ condition }) {
  if (condition) {
    useState(0);  // Sometimes called, sometimes not
  }
  useState('');   // Different position depending on condition
  
  // Render 1 (condition=true):  Hook positions: [0, 1]
  // Render 2 (condition=false): Hook positions: [0]
  // React loses track of which state is which!
}
```

### Where It Fits in Large-Scale Systems
In production apps:
- **ESLint plugin** (`eslint-plugin-react-hooks`) enforces rules at build time
- **React DevTools** shows hook order and values
- **Custom hooks** must follow the same rules to be composable
- **Code reviews** catch violations that ESLint misses

---

## 2️⃣ Deep-Dive Explanation (Senior / Staff Level)

### How It Actually Works Internally

#### React's Hooks Data Structure

React maintains a **linked list of hooks** on each component's fiber node:

```js
// Simplified internal structure
type Hook = {
  memoizedState: any,      // Current state value
  baseState: any,          // State before updates
  queue: UpdateQueue,      // Pending updates
  next: Hook | null        // Link to next hook
};

type Fiber = {
  memoizedState: Hook | null,  // First hook in linked list
  // ... other fiber properties
};
```

**During Initial Render:**
1. Component function executes
2. First `useState` call → React creates Hook #1, stores in fiber
3. Second `useState` call → React creates Hook #2, links to Hook #1
4. Third `useEffect` call → React creates Hook #3, links to Hook #2

```
Fiber.memoizedState → Hook #1 → Hook #2 → Hook #3 → null
                      (useState) (useState) (useEffect)
```

**During Re-render:**
1. Component function executes again
2. React resets internal cursor to first hook
3. Each hook call advances the cursor:
   - First `useState` → Read Hook #1
   - Second `useState` → Read Hook #2
   - Third `useEffect` → Read Hook #3

**Critical Insight:** React doesn't store hook names or keys. It relies **purely on order**.

#### What Happens When Rules Are Broken

**Scenario: Conditional Hook**
```jsx
function BrokenComponent({ showName }) {
  const [count, setCount] = useState(0);
  
  if (showName) {
    const [name, setName] = useState('');  // ❌ Conditional!
  }
  
  const [email, setEmail] = useState('');
  
  return <div>...</div>;
}
```

**First Render (showName=true):**
```
Hook #0: count = 0
Hook #1: name = ''
Hook #2: email = ''
```

**Second Render (showName=false):**
```
Hook #0: count = 0    ✓ Correct
Hook #1: email = ''   ✗ WRONG! React thinks this is 'name'
Hook #2: ???          ✗ React expects another hook, but there isn't one
```

**Result:** 
- `email` state gets the value meant for `name`
- React throws error: "Rendered fewer hooks than expected"
- Component state is corrupted

#### Browser Internals Involved

**Call Stack Context:**
When a hook is called, React checks:
```js
// Simplified React internals
function useState(initialState) {
  const dispatcher = resolveDispatcher();  // Get current dispatcher
  return dispatcher.useState(initialState);
}

function resolveDispatcher() {
  const dispatcher = ReactCurrentDispatcher.current;
  if (dispatcher === null) {
    throw new Error(
      'Hooks can only be called inside the body of a function component'
    );
  }
  return dispatcher;
}
```

**ReactCurrentDispatcher** is a global that React sets:
- **During render:** Points to actual hooks implementation
- **Outside render:** Set to `null` or throws errors

This is how React detects:
- Hooks called outside components
- Hooks called after render completes
- Hooks called in event handlers

**Fiber Architecture:**
```
Component Render → Fiber Node Created → Hooks Linked List Attached
                                      ↓
                              [Hook 1] → [Hook 2] → [Hook 3]
                                      ↓
                              Re-render Uses Same List
```

### Performance Implications

**Memory:**
- Each hook adds ~32-64 bytes to fiber node
- Conditional hooks don't save memory (fiber structure still exists)
- Deep hook chains increase memory footprint

**CPU:**
- Hook traversal is O(n) where n = number of hooks
- Typical component: 3-10 hooks → negligible cost
- Anti-pattern: 100+ hooks → noticeable overhead

**Optimization:**
```jsx
// ❌ BAD: Many hooks (harder to maintain, slight perf cost)
function ManyHooks() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  // ... 20 more useState calls
}

// ✅ BETTER: Group related state
function OptimizedState() {
  const [state, setState] = useState({ a: 0, b: 0, c: 0 });
  // Or use useReducer for complex state
}
```

### Scalability Concerns

**Large Codebases:**
1. **Custom Hooks Explosion**: 100+ custom hooks need clear naming conventions
2. **Dependency Arrays**: Easy to forget deps, causing stale closures
3. **Effect Chains**: useEffect calling setState → another useEffect → hard to debug

**Common Production Issues:**
```jsx
// ❌ Stale Closure (dependency missing)
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      console.log(count);  // Always logs 0!
    }, 1000);
    return () => clearInterval(timer);
  }, []);  // Missing 'count' dependency
}

// ✅ Fixed with dependency
useEffect(() => {
  const timer = setInterval(() => {
    console.log(count);
  }, 1000);
  return () => clearInterval(timer);
}, [count]);

// ✅ Or use functional update
useEffect(() => {
  const timer = setInterval(() => {
    setCount(c => {
      console.log(c);  // Always current
      return c;
    });
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

### Trade-offs and Constraints

**Pros of Hook Rules:**
- ✅ Simple implementation (linked list, no magic)
- ✅ Fast (O(n) traversal, usually small n)
- ✅ Predictable (same order = same behavior)
- ✅ Composable (custom hooks work seamlessly)

**Cons:**
- ❌ Non-intuitive for beginners (why can't I use if?)
- ❌ ESLint dependency required
- ❌ Early returns can be tricky
- ❌ Dynamic hook counts impossible

**Design Alternatives Considered:**

1. **Named Hooks** (like Solid.js)
   ```jsx
   const [count] = createSignal(0, 'count');  // Named
   ```
   - Pro: Order-independent
   - Con: More boilerplate, manual naming

2. **Compiler-Based** (like Svelte)
   ```js
   let count = 0;  // Compiled to reactive
   ```
   - Pro: No rules needed
   - Con: Magic, less explicit

3. **Automatic Dependency Tracking** (like Vue 3)
   ```js
   watchEffect(() => {
     console.log(count);  // Auto-tracks 'count'
   });
   ```
   - Pro: No dependency arrays
   - Con: Runtime overhead, less predictable

**React Chose Simplicity:** Explicit rules, fast runtime, composable.

### Real Production Optimizations

**1. ESLint Configuration**
```json
{
  "extends": ["react-app"],
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

**2. Custom Hook Patterns**
```jsx
// ✅ GOOD: All hooks at top level
function useUser(userId) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    fetchUser(userId).then(data => {
      setUser(data);
      setLoading(false);
    });
  }, [userId]);
  
  return { user, loading };
}

// ❌ BAD: Conditional hook
function useUserBad(userId) {
  if (!userId) {
    return { user: null, loading: false };  // Early return
  }
  
  const [user, setUser] = useState(null);  // ❌ Sometimes not called!
  // ...
}
```

**3. Early Returns Workaround**
```jsx
// ❌ WRONG: Hook after conditional return
function Component({ data }) {
  if (!data) {
    return <Loading />;
  }
  
  const [state] = useState(data);  // ❌ Not called when data is null
}

// ✅ CORRECT: All hooks first, then conditional render
function Component({ data }) {
  const [state] = useState(data);  // ✅ Always called
  
  if (!data) {
    return <Loading />;
  }
  
  return <div>{state}</div>;
}

// ✅ BETTER: Handle null in hook
function Component({ data }) {
  const [state] = useState(data || defaultValue);
  
  if (!data) {
    return <Loading />;
  }
  
  return <div>{state}</div>;
}
```

### Failure Cases & Common Misconceptions

**❌ "I can use hooks in event handlers"**
```jsx
function Bad() {
  const handleClick = () => {
    const [count, setCount] = useState(0);  // ❌ ERROR!
  };
  
  return <button onClick={handleClick}>Click</button>;
}
```
**Why it fails:** Hook called outside render, no fiber context.

**❌ "I can conditionally call hooks if I keep order"**
```jsx
function Bad({ conditionA, conditionB }) {
  if (conditionA) {
    const [a] = useState(0);  // ❌ Still wrong!
  }
  if (conditionB) {
    const [b] = useState(0);  // ❌ Order changes based on conditions
  }
}
```
**Why it fails:** Different renders have different hook counts.

**❌ "useEffect dependencies are optional"**
```jsx
function Bad() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    document.title = `Count: ${count}`;
  });  // ❌ Missing dependency array
  
  // Runs after EVERY render, even unrelated state changes!
}
```

**❌ "I can use hooks in class components"**
```jsx
class Bad extends React.Component {
  render() {
    const [count] = useState(0);  // ❌ ERROR!
    return <div>{count}</div>;
  }
}
```
**Why it fails:** Hooks need fiber's memoizedState, which classes don't use the same way.

**✅ Correct Patterns:**
```jsx
// ✅ Conditional logic INSIDE hook
function Good({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    if (!userId) {  // ✅ Condition inside effect
      setUser(null);
      return;
    }
    
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  return user ? <div>{user.name}</div> : <Loading />;
}

// ✅ Hooks in custom hook
function useConditionalValue(condition, value) {
  const [state, setState] = useState(value);
  
  useEffect(() => {
    if (condition) {  // ✅ Condition inside effect
      setState(value);
    }
  }, [condition, value]);
  
  return state;
}
```

---

## 3️⃣ Real-World Usage at Scale

### Facebook News Feed

**Challenge:** Complex component with many state variables and effects.

```jsx
function Post({ postId }) {
  // ✅ All hooks at top level, consistent order
  const [post, setPost] = useState(null);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  // Fetch post data
  useEffect(() => {
    fetchPost(postId).then(setPost);
  }, [postId]);
  
  // Subscribe to like updates
  useEffect(() => {
    const unsubscribe = subscribeLikes(postId, setLikes);
    return unsubscribe;
  }, [postId]);
  
  // Subscribe to comments
  useEffect(() => {
    if (!showComments) return;
    
    const unsubscribe = subscribeComments(postId, setComments);
    return unsubscribe;
  }, [postId, showComments]);
  
  // Check if user liked
  useEffect(() => {
    checkIfLiked(postId).then(setIsLiked);
  }, [postId]);
  
  const handleLike = useCallback(() => {
    // No hooks here! Just use the state setters
    setIsLiked(prev => !prev);
    setLikes(prev => prev + (isLiked ? -1 : 1));
    likePost(postId, !isLiked);
  }, [postId, isLiked]);
  
  if (!post) return <Skeleton />;
  
  return (
    <article>
      <PostContent content={post.content} />
      <LikeButton onClick={handleLike} count={likes} isLiked={isLiked} />
      <CommentSection 
        comments={comments} 
        visible={showComments}
        onToggle={() => setShowComments(prev => !prev)}
      />
    </article>
  );
}
```

**Why This Works:**
- All 9 hooks always called in same order
- Conditional logic inside effects, not around hooks
- Event handlers use closures, not hooks

### Airbnb Search Filters

**Challenge:** Many filters, some conditionally visible.

```jsx
// ❌ WRONG: Conditional hooks based on filters
function BadSearchFilters({ filters }) {
  const [location, setLocation] = useState('');
  
  if (filters.includes('dates')) {
    const [checkIn, setCheckIn] = useState(null);  // ❌ Conditional!
    const [checkOut, setCheckOut] = useState(null);
  }
  
  if (filters.includes('guests')) {
    const [guests, setGuests] = useState(1);  // ❌ Conditional!
  }
}

// ✅ CORRECT: All hooks unconditionally, render conditionally
function GoodSearchFilters({ filters }) {
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState(null);    // ✅ Always called
  const [checkOut, setCheckOut] = useState(null);  // ✅ Always called
  const [guests, setGuests] = useState(1);         // ✅ Always called
  
  return (
    <div>
      <LocationInput value={location} onChange={setLocation} />
      
      {filters.includes('dates') && (  // ✅ Conditional render, not hook
        <>
          <DateInput value={checkIn} onChange={setCheckIn} />
          <DateInput value={checkOut} onChange={setCheckOut} />
        </>
      )}
      
      {filters.includes('guests') && (
        <GuestsInput value={guests} onChange={setGuests} />
      )}
    </div>
  );
}
```

### Netflix Video Player

**Challenge:** Complex state machine with many effects.

```jsx
function VideoPlayer({ videoId }) {
  // State hooks (always in same order)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [quality, setQuality] = useState('auto');
  const [volume, setVolume] = useState(1);
  const [subtitles, setSubtitles] = useState(null);
  
  // Ref hooks
  const videoRef = useRef(null);
  const progressIntervalRef = useRef(null);
  
  // Memoization hooks
  const formattedTime = useMemo(() => {
    return formatTime(currentTime);
  }, [currentTime]);
  
  const progressPercent = useMemo(() => {
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);
  
  // Callback hooks
  const handlePlay = useCallback(() => {
    videoRef.current?.play();
    setIsPlaying(true);
  }, []);
  
  const handlePause = useCallback(() => {
    videoRef.current?.pause();
    setIsPlaying(false);
  }, []);
  
  // Effect hooks (order matters!)
  
  // 1. Load video metadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, []);
  
  // 2. Track playback progress
  useEffect(() => {
    if (!isPlaying) return;
    
    progressIntervalRef.current = setInterval(() => {
      setCurrentTime(videoRef.current?.currentTime || 0);
    }, 100);
    
    return () => clearInterval(progressIntervalRef.current);
  }, [isPlaying]);
  
  // 3. Update quality
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.quality = quality;
    }
  }, [quality]);
  
  // 4. Load subtitles
  useEffect(() => {
    if (!subtitles) return;
    
    loadSubtitles(videoId, subtitles).then(tracks => {
      // Apply to video
    });
  }, [videoId, subtitles]);
  
  // 5. Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === ' ') {
        isPlaying ? handlePause() : handlePlay();
      }
    };
    
    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, [isPlaying, handlePlay, handlePause]);
  
  return (
    <div className="video-player">
      <video ref={videoRef} src={`/videos/${videoId}`} />
      <Controls 
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        currentTime={formattedTime}
        progress={progressPercent}
      />
    </div>
  );
}
```

**Key Patterns:**
- 20+ hooks, all at top level
- Clear categorization: state → refs → memo → callbacks → effects
- Each effect has single responsibility
- Cleanup functions prevent memory leaks

### Stripe Payment Form

**Challenge:** Multi-step form with validation.

```jsx
function PaymentForm() {
  // ✅ All hooks always called, regardless of current step
  const [step, setStep] = useState(1);
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [billingAddress, setBillingAddress] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Validation (happens for all fields, but only shown for current step)
  useEffect(() => {
    const newErrors = {};
    
    if (cardNumber && !validateCardNumber(cardNumber)) {
      newErrors.cardNumber = 'Invalid card number';
    }
    if (expiry && !validateExpiry(expiry)) {
      newErrors.expiry = 'Invalid expiry date';
    }
    if (cvv && !validateCVV(cvv)) {
      newErrors.cvv = 'Invalid CVV';
    }
    
    setErrors(newErrors);
  }, [cardNumber, expiry, cvv]);
  
  // Analytics (track all steps)
  useEffect(() => {
    trackEvent('payment_form_step', { step });
  }, [step]);
  
  const handleSubmit = async () => {
    if (Object.keys(errors).length > 0) return;
    
    setIsSubmitting(true);
    try {
      await processPayment({ cardNumber, cardholderName, expiry, cvv, billingAddress });
      setStep(4);  // Success step
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // ✅ Conditional RENDERING, not conditional HOOKS
  return (
    <form>
      {step === 1 && (
        <CardDetailsStep 
          cardNumber={cardNumber}
          setCardNumber={setCardNumber}
          cardholderName={cardholderName}
          setCardholderName={setCardholderName}
          errors={errors}
        />
      )}
      
      {step === 2 && (
        <SecurityStep 
          expiry={expiry}
          setExpiry={setExpiry}
          cvv={cvv}
          setCvv={setCvv}
          errors={errors}
        />
      )}
      
      {step === 3 && (
        <BillingAddressStep 
          address={billingAddress}
          setAddress={setBillingAddress}
        />
      )}
      
      {step === 4 && <SuccessMessage />}
      
      <NavigationButtons 
        step={step}
        onNext={() => setStep(s => s + 1)}
        onBack={() => setStep(s => s - 1)}
        onSubmit={handleSubmit}
        disabled={isSubmitting || Object.keys(errors).length > 0}
      />
    </form>
  );
}
```

### What Breaks When Scale Increases

**Small App (10 components):**
- Forgetting dependencies → hard to notice
- Missing ESLint → catches later

**Medium App (100 components):**
- Stale closures become common bug
- Need strict ESLint configuration
- Custom hooks need documentation

**Large App (1000+ components):**
- Effect chains cause performance issues
- Need architectural patterns (state machines, reducers)
- Debugging hook order becomes critical
- React DevTools hook inspection is essential

**Common Scaling Issues:**
```jsx
// ❌ Effect chain cascade (performance killer)
function BadScaling() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  
  useEffect(() => {
    setB(a * 2);  // Triggers re-render
  }, [a]);
  
  useEffect(() => {
    setC(b * 2);  // Triggers another re-render
  }, [b]);
  
  useEffect(() => {
    console.log(c);  // Triggers yet another re-render
  }, [c]);
  
  // Result: One setA() causes 3 re-renders!
}

// ✅ Use derived state or useReducer
function GoodScaling() {
  const [a, setA] = useState(0);
  const b = a * 2;        // ✅ Derived
  const c = b * 2;        // ✅ Derived
  
  useEffect(() => {
    console.log(c);
  }, [c]);
  
  // Result: One setA() causes 1 re-render
}
```

---

## 4️⃣ Interview-Ready Answer & Follow-ups

### Crisp Interview Answer (2-3 minutes)

> "The Rules of Hooks are React's constraints for using hooks correctly. There are two rules:
>
> **Rule 1: Only call hooks at the top level** - Never inside loops, conditions, or nested functions.
>
> **Rule 2: Only call hooks from React functions** - Function components or custom hooks, not regular JavaScript functions.
>
> These rules exist because React tracks hooks using a **linked list indexed by call order**. On the initial render, React creates a hook for each call and stores them in sequence on the component's fiber node. On re-renders, React walks through this same list, matching each hook call to its stored state by position.
>
> If you conditionally call a hook, the order changes between renders, and React loses track of which state belongs to which hook. For example:
>
> ```jsx
> function Bad({ showName }) {
>   const [count, setCount] = useState(0);
>   if (showName) {
>     const [name, setName] = useState('');  // Sometimes called!
>   }
>   const [email, setEmail] = useState('');
> }
> ```
>
> First render with `showName=true`: hooks at positions 0, 1, 2.
> Second render with `showName=false`: hooks at positions 0, 1.
> React expects 3 hooks but finds 2, throwing an error.
>
> In production, we enforce these rules with:
> 1. **ESLint plugin** (`eslint-plugin-react-hooks`) - catches violations at build time
> 2. **React's runtime checks** (in dev mode) - warns about hook call issues
> 3. **Code review** - ensures custom hooks follow patterns
>
> The key insight is: put **conditional logic inside hooks**, not around them. For example, use `useEffect` with a condition inside, rather than conditionally calling `useEffect`."

### Likely Follow-up Questions

**Q: "Why did React choose this design? Why not use names or keys?"**

A: "React optimized for three goals:

1. **Performance**: Linked list traversal is O(n) with minimal overhead. Named hooks would need a hash map lookup (slower, more memory).

2. **Simplicity**: No magic, no hidden costs. You can trace exactly how hooks work. Naming would require automatic key generation or manual naming (boilerplate).

3. **Composability**: Custom hooks work seamlessly because they follow the same rules. With named hooks, you'd need conflict resolution when composing hooks.

Alternative designs exist:
- **Solid.js** uses signals with names - more flexible but different mental model
- **Vue 3** uses Proxy-based reactivity - automatic tracking but harder to debug
- **Svelte** compiles away the abstraction - magic, but you lose runtime flexibility

React chose explicit, predictable behavior over convenience."

**Q: "What happens if I break the rules?"**

A: "Several things can go wrong:

**Development Mode:**
```jsx
// React throws warning/error:
'Rendered fewer hooks than expected. This may be caused by 
an accidental early return statement.'
```

**Production:**
1. **State corruption**: Wrong state values assigned to wrong variables
2. **Stale closures**: Effects capture old values, causing bugs
3. **Memory leaks**: Cleanup functions don't run correctly
4. **Crashes**: React throws errors when hook count mismatches

**Example Bug:**
```jsx
function Broken({ condition }) {
  const [a, setA] = useState(0);
  
  if (condition) {
    const [b, setB] = useState(0);  // ❌
  }
  
  const [c, setC] = useState(0);
  
  // When condition changes from true → false:
  // c gets b's old state value!
  // setC actually updates b's state!
  // Complete chaos
}
```

The ESLint plugin (`react-hooks/rules-of-hooks`) catches 99% of these at build time."

**Q: "How do you handle conditional state?"**

A: "Three patterns:

**Pattern 1: Always call hook, conditionally use value**
```jsx
function Component({ needsName }) {
  const [name, setName] = useState('');  // ✅ Always called
  
  return (
    <div>
      {needsName && (  // ✅ Conditional render
        <input value={name} onChange={e => setName(e.target.value)} />
      )}
    </div>
  );
}
```

**Pattern 2: Use null/undefined as initial state**
```jsx
function Component({ userId }) {
  const [user, setUser] = useState(null);  // ✅ Always called
  
  useEffect(() => {
    if (!userId) {  // ✅ Condition inside effect
      setUser(null);
      return;
    }
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  if (!user) return <Loading />;
  return <div>{user.name}</div>;
}
```

**Pattern 3: Extract to custom hook**
```jsx
function useConditionalData(shouldFetch, fetchFn) {
  const [data, setData] = useState(null);  // ✅ Always called
  
  useEffect(() => {
    if (!shouldFetch) {  // ✅ Condition inside
      setData(null);
      return;
    }
    fetchFn().then(setData);
  }, [shouldFetch, fetchFn]);
  
  return data;
}

function Component({ needsData }) {
  const data = useConditionalData(needsData, fetchData);
  // ...
}
```

The key: **hooks always run, logic is conditional**."

**Q: "Can you explain the ESLint rules for hooks?"**

A: "The `eslint-plugin-react-hooks` package provides two rules:

**1. `react-hooks/rules-of-hooks`** (error level):
Enforces the two rules:
- Hooks only at top level (no loops, conditions, nested functions)
- Hooks only in function components or custom hooks

```jsx
// ❌ ESLint catches these
function Bad() {
  if (condition) {
    useState(0);  // Error: conditional hook
  }
  
  for (let i = 0; i < 5; i++) {
    useEffect(() => {});  // Error: hook in loop
  }
  
  function nested() {
    useState(0);  // Error: hook in nested function
  }
}
```

**2. `react-hooks/exhaustive-deps`** (warning level):
Validates useEffect/useCallback/useMemo dependency arrays:

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log(count);
  }, []);  // ⚠️ Warning: missing 'count' dependency
  
  // Auto-fix available: adds [count]
}
```

**Configuration:**
```json
{
  "rules": {
    "react-hooks/rules-of-hooks": "error",      // Must follow rules
    "react-hooks/exhaustive-deps": "warn"       // Should include deps
  }
}
```

In CI/CD, set both to `error` to block merges.

**Known Limitations:**
- Can't detect dynamic hook calls through indirection
- May give false positives with complex dependency patterns
- Doesn't catch semantic errors (wrong deps that don't error)"

**Q: "What about early returns?"**

A: "Early returns are tricky. All hooks must be called **before** any conditional return.

**❌ WRONG:**
```jsx
function Bad({ data }) {
  if (!data) {
    return <Loading />;  // ❌ Early return before hook
  }
  
  const [state] = useState(data);  // ❌ Not called when data is null
  return <div>{state}</div>;
}
```

**✅ CORRECT:**
```jsx
function Good({ data }) {
  const [state] = useState(data);  // ✅ Hook first
  
  if (!data) {
    return <Loading />;  // ✅ Early return after hooks
  }
  
  return <div>{state}</div>;
}
```

**✅ BETTER (with default value):**
```jsx
function Better({ data }) {
  const [state] = useState(data || defaultValue);
  
  return data ? <div>{state}</div> : <Loading />;
}
```

**Pattern for multiple early returns:**
```jsx
function Component({ a, b, c }) {
  // ✅ ALL hooks first
  const [state1] = useState(a);
  const [state2] = useState(b);
  const [state3] = useState(c);
  
  // ✅ Then all conditional returns
  if (!a) return <ErrorA />;
  if (!b) return <ErrorB />;
  if (!c) return <ErrorC />;
  
  return <Success data={{ state1, state2, state3 }} />;
}
```

Golden rule: **Hooks before returns**."

---

## 5️⃣ Code Walkthrough (Minimal & Relevant)

### Example 1: Visualizing Hook Order

```jsx
function Counter() {
  console.log('Render start');
  
  // Hook #0: useState
  const [count, setCount] = useState(() => {
    console.log('Hook #0: useState initializer');
    return 0;
  });
  
  // Hook #1: useState
  const [name, setName] = useState(() => {
    console.log('Hook #1: useState initializer');
    return '';
  });
  
  // Hook #2: useEffect
  useEffect(() => {
    console.log('Hook #2: useEffect callback');
    return () => console.log('Hook #2: useEffect cleanup');
  }, [count]);
  
  // Hook #3: useMemo
  const doubled = useMemo(() => {
    console.log('Hook #3: useMemo compute');
    return count * 2;
  }, [count]);
  
  // Hook #4: useCallback
  const handleClick = useCallback(() => {
    console.log('Hook #4: useCallback function');
    setCount(c => c + 1);
  }, []);
  
  console.log('Render end');
  
  return (
    <div>
      <p>{name} clicked {count} times (doubled: {doubled})</p>
      <button onClick={handleClick}>Increment</button>
    </div>
  );
}

// Initial render console output:
// Render start
// Hook #0: useState initializer
// Hook #1: useState initializer
// Hook #3: useMemo compute
// Render end
// Hook #2: useEffect callback

// Re-render (after button click):
// Render start
// Hook #3: useMemo compute (only if count changed)
// Render end
// Hook #2: useEffect cleanup (if count changed)
// Hook #2: useEffect callback (if count changed)
```

**Internal Hook Structure:**
```
Fiber.memoizedState → Hook #0 (useState: count)
                        ↓ next
                      Hook #1 (useState: name)
                        ↓ next
                      Hook #2 (useEffect: effect)
                        ↓ next
                      Hook #3 (useMemo: doubled)
                        ↓ next
                      Hook #4 (useCallback: handleClick)
                        ↓ next
                      null
```

### Example 2: Common Mistakes and Fixes

```jsx
// ❌ MISTAKE #1: Conditional hook
function BadConditional({ isAdmin }) {
  const [userData, setUserData] = useState(null);
  
  if (isAdmin) {
    const [adminData, setAdminData] = useState(null);  // ❌ Conditional!
  }
  
  return <div>...</div>;
}

// ✅ FIX: Always call hook, conditional logic inside
function GoodConditional({ isAdmin }) {
  const [userData, setUserData] = useState(null);
  const [adminData, setAdminData] = useState(null);  // ✅ Always called
  
  useEffect(() => {
    if (isAdmin) {  // ✅ Condition inside effect
      fetchAdminData().then(setAdminData);
    } else {
      setAdminData(null);
    }
  }, [isAdmin]);
  
  return <div>...</div>;
}

// ❌ MISTAKE #2: Hook in loop
function BadLoop({ items }) {
  return items.map(item => {
    const [selected, setSelected] = useState(false);  // ❌ In loop!
    return <Item key={item.id} selected={selected} />;
  });
}

// ✅ FIX: Extract to component (each has own hooks)
function GoodLoop({ items }) {
  return items.map(item => (
    <ItemWithState key={item.id} item={item} />  // ✅ Component
  ));
}

function ItemWithState({ item }) {
  const [selected, setSelected] = useState(false);  // ✅ Top level
  return <Item item={item} selected={selected} />;
}

// ❌ MISTAKE #3: Hook in callback
function BadCallback() {
  const handleClick = () => {
    const [clicked, setClicked] = useState(false);  // ❌ In callback!
    setClicked(true);
  };
  
  return <button onClick={handleClick}>Click</button>;
}

// ✅ FIX: Hook at top level, use in callback
function GoodCallback() {
  const [clicked, setClicked] = useState(false);  // ✅ Top level
  
  const handleClick = () => {
    setClicked(true);  // ✅ Just use the setter
  };
  
  return <button onClick={handleClick}>Click</button>;
}

// ❌ MISTAKE #4: Hook after early return
function BadEarlyReturn({ data }) {
  if (!data) {
    return <Loading />;  // ❌ Early return before hook
  }
  
  const [processed, setProcessed] = useState(null);  // ❌ Sometimes not called
  
  return <div>{processed}</div>;
}

// ✅ FIX: All hooks before any return
function GoodEarlyReturn({ data }) {
  const [processed, setProcessed] = useState(null);  // ✅ Always called first
  
  useEffect(() => {
    if (data) {  // ✅ Condition inside
      setProcessed(processData(data));
    }
  }, [data]);
  
  if (!data) {
    return <Loading />;  // ✅ After hooks
  }
  
  return <div>{processed}</div>;
}

// ❌ MISTAKE #5: Hook in class component
class BadClass extends React.Component {
  render() {
    const [state] = useState(0);  // ❌ Hooks don't work in classes
    return <div>{state}</div>;
  }
}

// ✅ FIX: Use class methods or convert to function component
class GoodClass extends React.Component {
  state = { value: 0 };  // ✅ Class state
  
  render() {
    return <div>{this.state.value}</div>;
  }
}

// Or convert to function:
function GoodFunction() {
  const [value] = useState(0);  // ✅ Hooks in function component
  return <div>{value}</div>;
}
```

### Example 3: Custom Hook Patterns

```jsx
// ✅ CORRECT: Custom hook follows rules
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return size;
}

// ✅ CORRECT: Composing custom hooks
function useUserData(userId) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Can call other hooks!
  const isOnline = useOnlineStatus(userId);  // ✅ Hook in hook
  
  useEffect(() => {
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    fetchUser(userId)
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [userId]);
  
  return { user, loading, error, isOnline };
}

// ✅ CORRECT: Using custom hooks
function Profile({ userId }) {
  const { user, loading, error, isOnline } = useUserData(userId);  // ✅ Top level
  const windowSize = useWindowSize();  // ✅ Top level
  
  if (loading) return <Loading />;
  if (error) return <Error message={error.message} />;
  
  return (
    <div>
      <h1>{user.name} {isOnline && '🟢'}</h1>
      <p>Window: {windowSize.width}x{windowSize.height}</p>
    </div>
  );
}

// ❌ WRONG: Conditional custom hook
function BadComponent({ needsUser, userId }) {
  if (needsUser) {
    const user = useUserData(userId);  // ❌ Conditional hook!
  }
}

// ✅ FIX: Always call, conditionally use
function GoodComponent({ needsUser, userId }) {
  const userData = useUserData(userId);  // ✅ Always called
  
  return (
    <div>
      {needsUser && <UserProfile user={userData.user} />}
    </div>
  );
}
```

### Example 4: Advanced Pattern - Dynamic Forms

```jsx
// ❌ WRONG: Creating hooks dynamically
function BadDynamicForm({ fields }) {
  const formData = {};
  
  fields.forEach(field => {
    const [value, setValue] = useState('');  // ❌ In loop!
    formData[field.name] = { value, setValue };
  });
  
  return <form>...</form>;
}

// ✅ CORRECT: Single state object
function GoodDynamicForm({ fields }) {
  // Create initial state from fields
  const initialState = fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue || '';
    return acc;
  }, {});
  
  const [formData, setFormData] = useState(initialState);  // ✅ One hook
  
  const handleChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };
  
  return (
    <form>
      {fields.map(field => (
        <input
          key={field.name}
          value={formData[field.name]}
          onChange={e => handleChange(field.name, e.target.value)}
        />
      ))}
    </form>
  );
}

// ✅ BETTER: useReducer for complex forms
function BestDynamicForm({ fields }) {
  const initialState = fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue || '';
    return acc;
  }, {});
  
  const [formData, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case 'SET_FIELD':
        return { ...state, [action.field]: action.value };
      case 'RESET':
        return initialState;
      default:
        return state;
    }
  }, initialState);
  
  return (
    <form>
      {fields.map(field => (
        <input
          key={field.name}
          value={formData[field.name]}
          onChange={e => dispatch({ 
            type: 'SET_FIELD', 
            field: field.name, 
            value: e.target.value 
          })}
        />
      ))}
      <button type="button" onClick={() => dispatch({ type: 'RESET' })}>
        Reset
      </button>
    </form>
  );
}
```

---

## 6️⃣ Why It Matters (Executive Summary)

### User Experience
- **Predictable behavior**: Consistent hook order ensures stable UI
- **No crashes**: Following rules prevents runtime errors
- **Smooth interactions**: Proper effect cleanup prevents memory leaks
- **Fast re-renders**: Optimized hook structure minimizes work

### Performance
- **Efficient traversal**: O(n) linked list access
- **Minimal memory**: Simple data structure, no hash maps
- **Fast updates**: Direct state lookup by position
- **Optimizable**: React can optimize hook internals knowing order is fixed

### Developer Productivity
- **ESLint catches errors**: Issues found at build time, not runtime
- **Clear debugging**: React DevTools shows hook order and values
- **Composable hooks**: Custom hooks work seamlessly
- **Predictable code**: Same rules everywhere, no special cases

### Business Outcomes
- **Fewer bugs**: Rules prevent entire class of state corruption issues
- **Faster debugging**: Clear rules make issues easier to identify
- **Easier onboarding**: Consistent patterns across codebase
- **Maintainable code**: Enforced structure improves long-term health

### How It Works (Simple Summary)
1. React stores hooks in a **linked list** on each component's fiber
2. List is built **in order** during first render
3. Re-renders **walk the same list** using position to match hooks
4. **Breaking order** corrupts the list, causing bugs/errors

### Why It Works
- **Simplicity**: Linked list is trivial to implement and fast
- **Performance**: O(n) traversal, minimal memory overhead
- **Predictability**: Fixed order means deterministic behavior
- **Composability**: Same rules for all hooks enable custom hooks

---

## 🎯 Key Takeaways for Interviews

### The Two Rules (Memorize)
1. **Only call hooks at the top level** (no loops, conditions, nested functions)
2. **Only call hooks from React functions** (components or custom hooks)

### Why Rules Exist
- React uses **call order** to track hooks (linked list indexed by position)
- Conditional hooks → order changes → state corruption

### How to Follow Rules
- ✅ Put **logic inside hooks**, not hooks inside logic
- ✅ Use **conditional rendering**, not conditional hooks
- ✅ All hooks **before** any early returns
- ✅ Extract repeated patterns to **custom hooks**

### ESLint Configuration
```json
{
  "extends": ["react-app"],
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Common Patterns
```jsx
// ✅ Conditional logic inside hook
const [data, setData] = useState(null);
useEffect(() => {
  if (condition) {
    fetchData().then(setData);
  }
}, [condition]);

// ✅ All hooks before returns
const [state] = useState(0);
if (!data) return <Loading />;

// ✅ Extract to component (not hook in loop)
items.map(item => <ItemComponent key={item.id} />);
```

### Red Flags to Avoid
- ❌ "Rules don't matter if I'm careful"
- ❌ "I can use index as key and conditional hooks"
- ❌ "Classes are better because no rules"
- ❌ Cannot explain why rules exist

### Green Flags to Hit
- ✅ Explain linked list implementation
- ✅ Show conditional logic inside hooks pattern
- ✅ Discuss ESLint integration
- ✅ Mention custom hooks composition
- ✅ Understand stale closure issues
- ✅ Know useReducer for complex state

---

## 🔗 Related Topics for Deeper Study

- **useState internals** (how state is stored in fiber)
- **useEffect internals** (effect scheduling and cleanup)
- **Custom hooks patterns** (composition and reuse)
- **React Fiber architecture** (where hooks live)
- **Stale closures** (dependency array importance)

---

*This document covers Senior/Staff-level depth on Rules of Hooks. For questions about specific hook implementations (useState, useEffect, useReducer), request those topics.*
