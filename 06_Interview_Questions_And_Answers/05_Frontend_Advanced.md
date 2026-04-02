# ⚛️ Frontend Advanced - React, Angular & JavaScript Internals

> **Target:** Senior Full Stack Engineer (7+ YOE)  
> **Focus:** React/Angular internals, JavaScript deep dive, Frontend System Design  
> **Companies:** All FAANG companies heavily test frontend knowledge

---

## 📋 Table of Contents

1. [JavaScript Internals](#javascript-internals)
2. [React Deep Dive](#react-deep-dive)
3. [Angular Deep Dive](#angular-deep-dive)
4. [Frontend System Design](#frontend-system-design)
5. [Performance Optimization](#performance-optimization)
6. [Web APIs & Browser](#web-apis)
7. [Output-Based Tricky Questions](#tricky-questions)
8. [FAANG Interview Questions](#interview-questions)

---

## 🔥 JavaScript Internals

### Event Loop & Call Stack

**How JavaScript executes code:**

```javascript
// JavaScript is single-threaded
// Uses Event Loop to handle async operations

console.log('1');

setTimeout(() => {
  console.log('2');
}, 0);

Promise.resolve().then(() => {
  console.log('3');
});

console.log('4');

// Output: 1, 4, 3, 2
// Why?
```

**Event Loop Architecture:**

```
┌───────────────────────────┐
│      Call Stack           │  ← Executes synchronous code
└───────────────────────────┘
            ↑
            │
┌───────────────────────────┐
│      Event Loop           │  ← Checks queues and pushes to call stack
└───────────────────────────┘
            ↑
    ┌───────┴────────┐
    │                │
┌───────────┐  ┌────────────┐
│Microtask  │  │ Macrotask  │
│  Queue    │  │   Queue    │
└───────────┘  └────────────┘
│              │
├─Promises     ├─setTimeout
├─queueMicro   ├─setInterval
├─MutationObs  ├─setImmediate
└─process.next ├─I/O
               └─UI rendering
```

**Execution Order:**

```javascript
// Step-by-step execution
console.log('1');  // Call stack → Execute → Output: 1

setTimeout(() => {
  console.log('2');
}, 0);  // Register in Macrotask Queue

Promise.resolve().then(() => {
  console.log('3');
});  // Register in Microtask Queue

console.log('4');  // Call stack → Execute → Output: 4

// Call stack empty
// Event loop checks: Microtask queue first
// → Execute Promise callback → Output: 3
// → Check Macrotask queue
// → Execute setTimeout callback → Output: 2

// Final output: 1, 4, 3, 2
```

**Complex Example:**

```javascript
console.log('Start');

setTimeout(() => {
  console.log('Timeout 1');
  Promise.resolve().then(() => console.log('Promise in Timeout 1'));
}, 0);

Promise.resolve()
  .then(() => {
    console.log('Promise 1');
    setTimeout(() => console.log('Timeout in Promise 1'), 0);
  })
  .then(() => console.log('Promise 2'));

setTimeout(() => {
  console.log('Timeout 2');
}, 0);

console.log('End');

/* Output:
Start
End
Promise 1
Promise 2
Timeout 1
Promise in Timeout 1
Timeout in Promise 1
Timeout 2

Explanation:
1. Synchronous: Start, End
2. Microtasks: Promise 1, Promise 2
3. Macrotask 1 (Timeout 1) + its microtask (Promise in Timeout 1)
4. Macrotask 2 (Timeout in Promise 1)
5. Macrotask 3 (Timeout 2)
*/
```

---

### Closures & Scope

**What is a closure?**

```javascript
// A closure is a function that has access to variables
// from its outer (enclosing) function's scope

function createCounter() {
  let count = 0;  // Private variable
  
  return {
    increment: function() {
      count++;
      return count;
    },
    decrement: function() {
      count--;
      return count;
    },
    getCount: function() {
      return count;
    }
  };
}

const counter = createCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.getCount());  // 2
console.log(counter.count);       // undefined (private!)
```

**Common Closure Pitfall:**

```javascript
// ❌ WRONG
for (var i = 0; i < 5; i++) {
  setTimeout(() => {
    console.log(i);  // Outputs: 5, 5, 5, 5, 5
  }, 1000);
}
// 'var' is function-scoped, all callbacks reference same 'i'
// After loop completes, i = 5

// ✅ FIX 1: Use 'let' (block-scoped)
for (let i = 0; i < 5; i++) {
  setTimeout(() => {
    console.log(i);  // Outputs: 0, 1, 2, 3, 4
  }, 1000);
}

// ✅ FIX 2: IIFE (Immediately Invoked Function Expression)
for (var i = 0; i < 5; i++) {
  (function(j) {
    setTimeout(() => {
      console.log(j);  // Outputs: 0, 1, 2, 3, 4
    }, 1000);
  })(i);
}

// ✅ FIX 3: Bind
for (var i = 0; i < 5; i++) {
  setTimeout(console.log.bind(null, i), 1000);
}
```

**Real-world closure example:**

```javascript
// Module Pattern (before ES6 modules)
const ShoppingCart = (function() {
  // Private variables
  let items = [];
  let totalPrice = 0;
  
  // Private function
  function calculateTotal() {
    totalPrice = items.reduce((sum, item) => sum + item.price, 0);
  }
  
  // Public API
  return {
    addItem: function(item) {
      items.push(item);
      calculateTotal();
    },
    
    removeItem: function(itemId) {
      items = items.filter(item => item.id !== itemId);
      calculateTotal();
    },
    
    getTotal: function() {
      return totalPrice;
    },
    
    getItems: function() {
      // Return copy to prevent external modification
      return [...items];
    }
  };
})();

ShoppingCart.addItem({ id: 1, name: 'Book', price: 20 });
ShoppingCart.addItem({ id: 2, name: 'Pen', price: 5 });
console.log(ShoppingCart.getTotal()); // 25
console.log(ShoppingCart.items);      // undefined (private!)
```

---

### Prototypes & Inheritance

**Prototype Chain:**

```javascript
// Every object has a prototype (__proto__)
// Constructor functions have a prototype property

function Person(name, age) {
  this.name = name;
  this.age = age;
}

Person.prototype.greet = function() {
  return `Hi, I'm ${this.name}`;
};

const john = new Person('John', 30);

console.log(john.greet());  // "Hi, I'm John"

// Prototype chain:
john
  .__proto__ === Person.prototype
    .__proto__ === Object.prototype
      .__proto__ === null

// When you call john.greet():
// 1. Check john object → not found
// 2. Check john.__proto__ (Person.prototype) → found!
// 3. Execute greet() with this = john
```

**Classical Inheritance (ES5):**

```javascript
function Animal(name) {
  this.name = name;
}

Animal.prototype.eat = function() {
  return `${this.name} is eating`;
};

function Dog(name, breed) {
  Animal.call(this, name);  // Call parent constructor
  this.breed = breed;
}

// Set up prototype chain
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;

Dog.prototype.bark = function() {
  return `${this.name} says Woof!`;
};

const dog = new Dog('Max', 'Labrador');
console.log(dog.eat());   // "Max is eating" (inherited)
console.log(dog.bark());  // "Max says Woof!"
```

**ES6 Classes (Syntactic Sugar):**

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }
  
  eat() {
    return `${this.name} is eating`;
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);  // Call parent constructor
    this.breed = breed;
  }
  
  bark() {
    return `${this.name} says Woof!`;
  }
}

const dog = new Dog('Max', 'Labrador');
console.log(dog.eat());   // "Max is eating"
console.log(dog.bark());  // "Max says Woof!"

// Still uses prototypes under the hood!
console.log(dog.__proto__ === Dog.prototype);  // true
console.log(Dog.prototype.__proto__ === Animal.prototype);  // true
```

---

### `this` Keyword

**Rules for determining `this`:**

```javascript
// 1. Global context
console.log(this);  // Window (browser) or global (Node.js)

// 2. Function call
function foo() {
  console.log(this);  // Window (non-strict) or undefined (strict mode)
}
foo();

// 3. Method call
const obj = {
  name: 'John',
  greet: function() {
    console.log(this.name);  // 'this' = obj
  }
};
obj.greet();  // "John"

// 4. Constructor call
function Person(name) {
  this.name = name;  // 'this' = new object
}
const person = new Person('John');

// 5. Explicit binding (call, apply, bind)
function greet() {
  console.log(`Hi, I'm ${this.name}`);
}
const user = { name: 'John' };
greet.call(user);   // "Hi, I'm John"
greet.apply(user);  // "Hi, I'm John"
const boundGreet = greet.bind(user);
boundGreet();       // "Hi, I'm John"

// 6. Arrow functions (lexical 'this')
const obj2 = {
  name: 'John',
  greet: function() {
    setTimeout(() => {
      console.log(this.name);  // 'this' from enclosing scope (obj2)
    }, 1000);
  }
};
obj2.greet();  // "John"

// vs regular function:
const obj3 = {
  name: 'John',
  greet: function() {
    setTimeout(function() {
      console.log(this.name);  // 'this' = Window or undefined
    }, 1000);
  }
};
obj3.greet();  // undefined
```

**Tricky Example:**

```javascript
const user = {
  name: 'John',
  greet: function() {
    console.log(`Hi, I'm ${this.name}`);
  }
};

user.greet();  // "Hi, I'm John"

const greet = user.greet;
greet();  // "Hi, I'm undefined" (this = Window/undefined)

// Fix:
const boundGreet = user.greet.bind(user);
boundGreet();  // "Hi, I'm John"
```

---

## ⚛️ React Deep Dive

### Virtual DOM & Reconciliation

**What is Virtual DOM?**

```javascript
// Virtual DOM is a lightweight JavaScript representation of the real DOM

// Real DOM:
<div id="app">
  <h1>Hello</h1>
  <p>World</p>
</div>

// Virtual DOM (React Element):
{
  type: 'div',
  props: {
    id: 'app',
    children: [
      {
        type: 'h1',
        props: { children: 'Hello' }
      },
      {
        type: 'p',
        props: { children: 'World' }
      }
    ]
  }
}
```

**Reconciliation Algorithm:**

```javascript
// When state changes, React creates NEW Virtual DOM
// Then compares (diffs) with OLD Virtual DOM

// Old Virtual DOM:
<ul>
  <li>Apple</li>
  <li>Banana</li>
</ul>

// New Virtual DOM:
<ul>
  <li>Apple</li>
  <li>Banana</li>
  <li>Cherry</li>  {/* Added */}
</ul>

// React's Diff Algorithm:
// 1. Different types → destroy old, create new
// 2. Same type, different props → update props
// 3. Same type, same props → skip

// Optimization: Keys
// ❌ Without keys:
<ul>
  <li>Apple</li>
  <li>Banana</li>
</ul>
// User adds 'Cherry' at beginning:
<ul>
  <li>Cherry</li>  {/* React thinks: Apple → Cherry (UPDATE) */}
  <li>Apple</li>   {/* React thinks: Banana → Apple (UPDATE) */}
  <li>Banana</li>  {/* React thinks: new item (CREATE) */}
</ul>
// 2 updates + 1 create (inefficient!)

// ✅ With keys:
<ul>
  <li key="1">Apple</li>
  <li key="2">Banana</li>
</ul>
// User adds 'Cherry' at beginning:
<ul>
  <li key="3">Cherry</li>  {/* CREATE */}
  <li key="1">Apple</li>   {/* MOVE */}
  <li key="2">Banana</li>  {/* MOVE */}
</ul>
// 1 create + 2 moves (efficient!)
```

---

### React Fiber Architecture

**What is Fiber?**

Fiber is React's new reconciliation engine (React 16+). It enables:
- **Incremental rendering**: Split work into chunks
- **Pause/resume/abort rendering**: Priority-based
- **Concurrent rendering**: Don't block main thread

**Before Fiber (Stack Reconciler):**

```javascript
// React 15 and earlier
// Reconciliation was synchronous and recursive
// If component tree was large, main thread blocked

function reconcile(element) {
  // 1. Update component
  // 2. Recursively update children
  element.children.forEach(child => reconcile(child));
  // 3. Commit to DOM
}

// Problem: For large trees, this could take 100ms+
// → UI freezes, animations jank
```

**With Fiber:**

```javascript
// React 16+
// Work is split into units (fibers)
// Browser can interrupt for high-priority work

// Fiber is a JavaScript object representing a unit of work
{
  type: 'div',
  props: { ... },
  stateNode: <actual DOM node>,
  child: <fiber>,      // First child
  sibling: <fiber>,    // Next sibling
  return: <fiber>,     // Parent
  effectTag: 'UPDATE', // What to do (PLACEMENT, UPDATE, DELETION)
  alternate: <fiber>   // Previous fiber (for diffing)
}

// Render Phase (can be interrupted):
// 1. Create work-in-progress fiber tree
// 2. Mark effects (updates, deletions, etc.)

// Commit Phase (cannot be interrupted):
// 1. Apply all effects to DOM
// 2. Call lifecycle methods (componentDidMount, etc.)
```

**Priority Levels:**

```javascript
// React assigns priority to updates
// High priority updates interrupt low priority ones

// Immediate (highest)
// - User input (click, typing)
// - Synchronous updates

// User-blocking
// - Hover, scroll

// Normal
// - Data fetching
// - Network responses

// Low
// - Analytics

// Idle (lowest)
// - Background work

// Example:
function SearchInput() {
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const handleChange = (e) => {
    // High priority (immediate user feedback)
    setInputValue(e.target.value);
    
    // Low priority (can be delayed)
    startTransition(() => {
      setSearchResults(performSearch(e.target.value));
    });
  };
  
  return (
    <div>
      <input value={inputValue} onChange={handleChange} />
      <Results data={searchResults} />
    </div>
  );
}

// inputValue updates immediately
// searchResults updates can be interrupted if user types again
```

---

### Hooks Internals

**How useState works:**

```javascript
// React maintains a "fiber" node for each component
// Hooks are stored as a linked list on the fiber

// Simplified implementation:
let currentFiber = null;
let hookIndex = 0;

function useState(initialValue) {
  // Get current fiber's hooks array
  const hooks = currentFiber.hooks || (currentFiber.hooks = []);
  
  // Get or create hook at current index
  if (hookIndex >= hooks.length) {
    hooks.push({
      state: initialValue,
      queue: []
    });
  }
  
  const hook = hooks[hookIndex];
  
  // Process queued updates
  hook.queue.forEach(action => {
    hook.state = typeof action === 'function' 
      ? action(hook.state) 
      : action;
  });
  hook.queue = [];
  
  // setState function
  const setState = (action) => {
    hook.queue.push(action);
    scheduleRender();  // Trigger re-render
  };
  
  hookIndex++;
  return [hook.state, setState];
}

// Why can't you call hooks conditionally?
function MyComponent() {
  const [count, setCount] = useState(0);  // Hook 0
  
  if (count > 0) {
    const [name, setName] = useState('');  // ❌ Hook 1 sometimes
  }
  
  const [age, setAge] = useState(30);  // Hook 1 or 2?
  
  // React relies on CALL ORDER to match hooks
  // Conditional hooks break this order
}

// ✅ Correct:
function MyComponent() {
  const [count, setCount] = useState(0);     // Hook 0
  const [name, setName] = useState('');      // Hook 1
  const [age, setAge] = useState(30);        // Hook 2
  
  // Use conditional logic INSIDE hooks
  const displayName = count > 0 ? name : 'Guest';
}
```

**useEffect Internals:**

```javascript
// Simplified implementation:
function useEffect(callback, deps) {
  const hooks = currentFiber.hooks || (currentFiber.hooks = []);
  
  if (hookIndex >= hooks.length) {
    hooks.push({
      deps: deps,
      cleanup: null
    });
  }
  
  const hook = hooks[hookIndex];
  const prevDeps = hook.deps;
  
  // Check if dependencies changed
  const depsChanged = !prevDeps || 
    !deps || 
    deps.some((dep, i) => dep !== prevDeps[i]);
  
  if (depsChanged) {
    // Run cleanup from previous render
    if (hook.cleanup) {
      hook.cleanup();
    }
    
    // Schedule effect to run after commit phase
    scheduleEffect(() => {
      hook.cleanup = callback();
    });
    
    hook.deps = deps;
  }
  
  hookIndex++;
}

// Effect execution order:
function MyComponent() {
  useEffect(() => {
    console.log('1. Component mounted/updated');
    return () => console.log('1. Cleanup');
  });
  
  useEffect(() => {
    console.log('2. Component mounted/updated');
    return () => console.log('2. Cleanup');
  });
  
  return <div>Hello</div>;
}

// First render:
// 1. Render phase (create Virtual DOM)
// 2. Commit phase (update real DOM)
// 3. Run effects:
//    → "1. Component mounted/updated"
//    → "2. Component mounted/updated"

// Second render (re-render):
// 1. Render phase
// 2. Commit phase
// 3. Run cleanups:
//    → "1. Cleanup"
//    → "2. Cleanup"
// 4. Run effects:
//    → "1. Component mounted/updated"
//    → "2. Component mounted/updated"

// Unmount:
// 1. Run cleanups:
//    → "1. Cleanup"
//    → "2. Cleanup"
```

**useMemo & useCallback:**

```javascript
// useMemo: Memoize expensive calculations
function SearchResults({ query }) {
  // ❌ Without useMemo:
  const filteredResults = expensiveFilter(allData, query);
  // Runs on EVERY render (even if query unchanged)
  
  // ✅ With useMemo:
  const filteredResults = useMemo(() => {
    return expensiveFilter(allData, query);
  }, [query, allData]);
  // Only re-runs if query or allData changes
  
  return <div>{filteredResults.map(...)}</div>;
}

// useCallback: Memoize functions
function Parent() {
  const [count, setCount] = useState(0);
  
  // ❌ Without useCallback:
  const handleClick = () => {
    console.log('Clicked');
  };
  // New function created on every render
  // Child re-renders even if nothing changed
  
  // ✅ With useCallback:
  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);
  // Same function reference across renders
  // Child doesn't re-render unnecessarily
  
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <ExpensiveChild onClick={handleClick} />
    </div>
  );
}

const ExpensiveChild = React.memo(({ onClick }) => {
  console.log('Child rendered');
  return <button onClick={onClick}>Click me</button>;
});
```

---

### Context API & Performance

```javascript
// Problem: Prop drilling
function App() {
  const [user, setUser] = useState(null);
  
  return <Layout user={user} setUser={setUser} />;
}

function Layout({ user, setUser }) {
  return <Header user={user} setUser={setUser} />;
}

function Header({ user, setUser }) {
  return <UserMenu user={user} setUser={setUser} />;
}

function UserMenu({ user, setUser }) {
  // Finally use user!
}

// Solution: Context API
const UserContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Layout />
    </UserContext.Provider>
  );
}

function UserMenu() {
  const { user, setUser } = useContext(UserContext);
  // Direct access, no prop drilling!
}

// Performance Problem: ALL consumers re-render when context changes
const UserContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  return (
    <UserContext.Provider value={{ user, setUser, theme, setTheme }}>
      <UserProfile />
      <ThemeToggle />
    </UserContext.Provider>
  );
}

function UserProfile() {
  const { user } = useContext(UserContext);
  // Re-renders when theme changes too! ❌
  return <div>{user.name}</div>;
}

function ThemeToggle() {
  const { theme, setTheme } = useContext(UserContext);
  // Re-renders when user changes too! ❌
  return <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
    Toggle Theme
  </button>;
}

// Fix 1: Split contexts
const UserContext = createContext();
const ThemeContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <UserProfile />
        <ThemeToggle />
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

// Fix 2: Memoize value
function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  const userValue = useMemo(() => ({ user, setUser }), [user]);
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);
  
  return (
    <UserContext.Provider value={userValue}>
      <ThemeContext.Provider value={themeValue}>
        <UserProfile />
        <ThemeToggle />
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

// Fix 3: Use state management library (Redux, Zustand, Jotai)
```

---

## 🅰️ Angular Deep Dive

### Change Detection

**How Angular detects changes:**

```typescript
// Angular uses Zone.js to monkey-patch browser APIs
// Whenever async operation completes, Angular runs change detection

// Zone.js patches:
// - setTimeout, setInterval
// - Promise.then
// - XHR requests
// - DOM events

// Example:
@Component({
  selector: 'app-counter',
  template: `
    <div>Count: {{ count }}</div>
    <button (click)="increment()">Increment</button>
  `
})
export class CounterComponent {
  count = 0;
  
  increment() {
    this.count++;  // Change detection triggered automatically
  }
  
  // Behind the scenes:
  // 1. User clicks button
  // 2. Zone.js detects event
  // 3. Angular runs change detection
  // 4. Updates DOM if needed
}
```

**Change Detection Strategies:**

```typescript
// Default: Check entire component tree
@Component({
  selector: 'app-user-list',
  changeDetection: ChangeDetectionStrategy.Default,  // Default
  template: `
    <div *ngFor="let user of users">
      {{ user.name }}
    </div>
  `
})
export class UserListComponent {
  @Input() users: User[];
  
  // With Default strategy:
  // - Angular checks this component on EVERY change detection cycle
  // - Even if users array hasn't changed
}

// OnPush: Only check if:
// 1. Input reference changes
// 2. Event emitted from component
// 3. Observable emits (with async pipe)
// 4. Manually triggered (ChangeDetectorRef.markForCheck())

@Component({
  selector: 'app-user-list',
  changeDetection: ChangeDetectionStrategy.OnPush,  // Optimized
  template: `
    <div *ngFor="let user of users">
      {{ user.name }}
    </div>
  `
})
export class UserListComponent {
  @Input() users: User[];
  
  // With OnPush:
  // - Only checks when users REFERENCE changes
  // - users.push(newUser) → No change detection (same reference)
  // - users = [...users, newUser] → Change detection (new reference)
}

// Manual change detection:
@Component({
  selector: 'app-manual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>{{ data }}</div>`
})
export class ManualComponent implements OnInit {
  data: string;
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit() {
    // Run outside Angular zone (no auto change detection)
    this.ngZone.runOutsideAngular(() => {
      setInterval(() => {
        this.data = new Date().toISOString();
        
        // Manually trigger change detection
        this.cdr.markForCheck();
      }, 1000);
    });
  }
}
```

---

### Dependency Injection

```typescript
// Angular's DI system is hierarchical
// Injectors form a tree matching component tree

// Root injector (singleton across app)
@Injectable({
  providedIn: 'root'  // Single instance for entire app
})
export class UserService {
  private users: User[] = [];
  
  getUsers() {
    return this.users;
  }
}

// Module injector
@NgModule({
  providers: [
    UserService  // New instance for this module
  ]
})
export class UserModule {}

// Component injector
@Component({
  selector: 'app-user-list',
  providers: [
    UserService  // New instance for this component and children
  ]
})
export class UserListComponent {
  constructor(private userService: UserService) {
    // Gets instance from nearest injector
  }
}

// Injection tokens (for non-class dependencies)
export const API_URL = new InjectionToken<string>('API_URL');

@NgModule({
  providers: [
    { provide: API_URL, useValue: 'https://api.example.com' }
  ]
})
export class AppModule {}

@Injectable()
export class ApiService {
  constructor(@Inject(API_URL) private apiUrl: string) {
    console.log(apiUrl);  // 'https://api.example.com'
  }
}

// Factory providers
@NgModule({
  providers: [
    {
      provide: UserService,
      useFactory: (http: HttpClient, config: AppConfig) => {
        return new UserService(http, config.apiUrl);
      },
      deps: [HttpClient, AppConfig]
    }
  ]
})
export class AppModule {}
```

---

### RxJS Patterns

```typescript
// Common operators in Angular

// 1. switchMap: Cancel previous, switch to new
@Component({
  template: `
    <input [formControl]="searchControl">
    <div *ngFor="let result of results$ | async">{{ result }}</div>
  `
})
export class SearchComponent implements OnInit {
  searchControl = new FormControl('');
  results$: Observable<string[]>;
  
  constructor(private searchService: SearchService) {}
  
  ngOnInit() {
    this.results$ = this.searchControl.valueChanges.pipe(
      debounceTime(300),      // Wait 300ms after user stops typing
      distinctUntilChanged(), // Only if value actually changed
      switchMap(query => {    // Cancel previous request, make new one
        return this.searchService.search(query);
      })
    );
  }
}

// 2. mergeMap: Don't cancel, process all
loadMultipleUsers(userIds: number[]) {
  return from(userIds).pipe(
    mergeMap(id => this.http.get(`/api/users/${id}`)),  // Parallel requests
    toArray()  // Collect all results
  );
}

// 3. concatMap: Process sequentially
processInOrder(tasks: Task[]) {
  return from(tasks).pipe(
    concatMap(task => this.processTask(task))  // Wait for each to complete
  );
}

// 4. combineLatest: Combine multiple observables
@Component({
  template: `
    <div *ngIf="vm$ | async as vm">
      User: {{ vm.user.name }}
      Settings: {{ vm.settings.theme }}
    </div>
  `
})
export class ProfileComponent {
  vm$ = combineLatest([
    this.userService.currentUser$,
    this.settingsService.settings$
  ]).pipe(
    map(([user, settings]) => ({ user, settings }))
  );
}

// 5. shareReplay: Cache and share
@Injectable({ providedIn: 'root' })
export class UserService {
  private currentUser$ = this.http.get<User>('/api/user').pipe(
    shareReplay(1)  // Cache last value, share among subscribers
  );
  
  getCurrentUser() {
    return this.currentUser$;  // Multiple subscribers, single HTTP request
  }
}
```

---

## 🏗️ Frontend System Design

### Design: LinkedIn Feed UI

**Requirements:**
1. Infinite scroll feed
2. Real-time updates (new posts appear)
3. Like/comment functionality
4. Image/video support
5. Performance (handle 1000+ posts)

**Component Architecture:**

```
App
├── FeedContainer (smart component)
│   ├── FeedHeader
│   ├── CreatePost
│   └── PostList (virtualized)
│       └── PostItem (x 20 visible)
│           ├── PostHeader
│           ├── PostContent
│           ├── PostMedia
│           └── PostActions
└── WebSocket connection
```

**Implementation:**

```typescript
// 1. Virtual Scrolling (only render visible items)
import { VirtualScroller } from '@angular/cdk/scrolling';

@Component({
  template: `
    <cdk-virtual-scroll-viewport itemSize="200" class="feed-viewport">
      <app-post-item 
        *cdkVirtualFor="let post of posts"
        [post]="post"
        (like)="handleLike($event)"
        (comment)="handleComment($event)">
      </app-post-item>
    </cdk-virtual-scroll-viewport>
  `
})
export class FeedComponent {
  posts: Post[] = [];
  
  // Only renders ~20 items (visible + buffer)
  // Not all 1000+ posts
}

// 2. Infinite Scroll
@Component({
  template: `
    <cdk-virtual-scroll-viewport 
      (scrolledIndexChange)="onScroll($event)"
      itemSize="200">
      <!-- posts -->
    </cdk-virtual-scroll-viewport>
  `
})
export class FeedComponent {
  posts: Post[] = [];
  isLoading = false;
  hasMore = true;
  
  onScroll(index: number) {
    // Load more when near bottom
    if (index > this.posts.length - 5 && !this.isLoading && this.hasMore) {
      this.loadMore();
    }
  }
  
  loadMore() {
    this.isLoading = true;
    
    this.feedService.getPosts(this.posts.length, 20).subscribe(newPosts => {
      this.posts = [...this.posts, ...newPosts];
      this.hasMore = newPosts.length === 20;
      this.isLoading = false;
    });
  }
}

// 3. Real-time updates (WebSocket)
@Injectable({ providedIn: 'root' })
export class FeedRealtimeService {
  private ws: WebSocket;
  private newPostsSubject = new Subject<Post>();
  
  newPosts$ = this.newPostsSubject.asObservable();
  
  connect() {
    this.ws = new WebSocket('wss://api.example.com/feed');
    
    this.ws.onmessage = (event) => {
      const post = JSON.parse(event.data);
      this.newPostsSubject.next(post);
    };
  }
}

@Component({
  template: `
    <div *ngIf="newPostsCount > 0" class="new-posts-banner">
      <button (click)="loadNewPosts()">
        Load {{ newPostsCount }} new posts
      </button>
    </div>
    <!-- feed -->
  `
})
export class FeedComponent implements OnInit {
  newPostsCount = 0;
  pendingPosts: Post[] = [];
  
  ngOnInit() {
    this.realtimeService.newPosts$.subscribe(post => {
      this.pendingPosts.push(post);
      this.newPostsCount++;
    });
  }
  
  loadNewPosts() {
    this.posts = [...this.pendingPosts, ...this.posts];
    this.pendingPosts = [];
    this.newPostsCount = 0;
  }
}

// 4. Optimistic Updates (instant feedback)
@Component({
  template: `
    <button 
      [class.liked]="post.liked"
      (click)="toggleLike()">
      {{ post.likeCount }}
    </button>
  `
})
export class PostActionsComponent {
  @Input() post: Post;
  
  toggleLike() {
    // 1. Update UI immediately (optimistic)
    const originalLiked = this.post.liked;
    const originalCount = this.post.likeCount;
    
    this.post.liked = !this.post.liked;
    this.post.likeCount += this.post.liked ? 1 : -1;
    
    // 2. Send request to server
    this.postService.toggleLike(this.post.id).subscribe({
      next: (response) => {
        // Server confirmed, update with actual data
        this.post.likeCount = response.likeCount;
      },
      error: () => {
        // Revert on error
        this.post.liked = originalLiked;
        this.post.likeCount = originalCount;
        this.snackbar.open('Failed to like post');
      }
    });
  }
}

// 5. Image Lazy Loading
@Component({
  template: `
    <img 
      [src]="imageSrc"
      [attr.loading]="'lazy'"
      (load)="onImageLoad()"
      (error)="onImageError()">
  `
})
export class PostImageComponent {
  @Input() post: Post;
  imageSrc: string = 'placeholder.jpg';
  
  ngOnInit() {
    // Load low-quality placeholder first
    this.imageSrc = this.post.thumbnailUrl;
    
    // Preload full image
    const img = new Image();
    img.src = this.post.imageUrl;
    img.onload = () => {
      this.imageSrc = this.post.imageUrl;
    };
  }
}

// 6. State Management (NgRx)
interface FeedState {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  optimisticUpdates: Map<string, any>;
}

// Actions
export const loadPosts = createAction('[Feed] Load Posts');
export const loadPostsSuccess = createAction(
  '[Feed] Load Posts Success',
  props<{ posts: Post[] }>()
);
export const likePost = createAction(
  '[Feed] Like Post',
  props<{ postId: string }>()
);

// Reducer
const feedReducer = createReducer(
  initialState,
  on(loadPosts, state => ({ ...state, isLoading: true })),
  on(loadPostsSuccess, (state, { posts }) => ({
    ...state,
    posts: [...state.posts, ...posts],
    isLoading: false
  })),
  on(likePost, (state, { postId }) => ({
    ...state,
    posts: state.posts.map(post =>
      post.id === postId
        ? { ...post, liked: !post.liked, likeCount: post.liked ? post.likeCount - 1 : post.likeCount + 1 }
        : post
    )
  }))
);

// Effects
@Injectable()
export class FeedEffects {
  loadPosts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPosts),
      mergeMap(() =>
        this.feedService.getPosts().pipe(
          map(posts => loadPostsSuccess({ posts })),
          catchError(() => of(loadPostsFailure()))
        )
      )
    )
  );
}
```

**Performance Optimizations:**

```typescript
// 1. OnPush change detection
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostItemComponent {
  @Input() post: Post;  // Only re-render if post reference changes
}

// 2. TrackBy function
@Component({
  template: `
    <app-post-item 
      *ngFor="let post of posts; trackBy: trackByPostId"
      [post]="post">
    </app-post-item>
  `
})
export class FeedComponent {
  trackByPostId(index: number, post: Post) {
    return post.id;  // Reuse DOM nodes for same post
  }
}

// 3. Debounce scroll events
@Component({
  template: `<div (scroll)="onScroll($event)">...</div>`
})
export class FeedComponent {
  private scrollSubject = new Subject<Event>();
  
  ngOnInit() {
    this.scrollSubject.pipe(
      debounceTime(200),
      distinctUntilChanged()
    ).subscribe(() => {
      this.loadMore();
    });
  }
  
  onScroll(event: Event) {
    this.scrollSubject.next(event);
  }
}

// 4. Memoization
import { memoize } from 'lodash';

export class FeedService {
  private processPostData = memoize((post: Post) => {
    // Expensive computation
    return {
      ...post,
      formattedDate: this.formatDate(post.createdAt),
      excerpt: this.createExcerpt(post.content)
    };
  }, (post) => post.id);  // Cache key
}
```

---

## 🎯 Tricky Output Questions

**Question 1:**

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000);
}

// Output: 3, 3, 3 (after 1 second)
// Why? 'var' is function-scoped, all callbacks reference same 'i'
```

**Question 2:**

```javascript
console.log(typeof null);          // "object" (JavaScript bug!)
console.log(typeof undefined);     // "undefined"
console.log(typeof NaN);           // "number"
console.log(NaN === NaN);          // false
console.log(Object.is(NaN, NaN));  // true
```

**Question 3:**

```javascript
const obj = {
  a: 1,
  b: function() { return this.a; },
  c: () => { return this.a; }
};

console.log(obj.b());  // 1 (this = obj)
console.log(obj.c());  // undefined (arrow function has lexical this)

const b = obj.b;
console.log(b());      // undefined (this = window/undefined)
```

**Question 4:**

```javascript
console.log(1 + "2" + "2");  // "122"
console.log(1 + +"2" + "2"); // "32"
console.log(1 + -"1" + "2"); // "02"
console.log(+"1" + "1" + "2");  // "112"
console.log("A" - "B" + "2");   // "NaN2"
console.log("A" - "B" + 2);     // NaN
```

**Question 5:**

```javascript
const promise = new Promise((resolve) => {
  console.log(1);
  resolve();
  console.log(2);
});

promise.then(() => {
  console.log(3);
});

console.log(4);

// Output: 1, 2, 4, 3
// Promise executor runs immediately
// resolve() doesn't stop execution
// then() callback is microtask (runs after synchronous code)
```

---

This covers the essentials of frontend development for FAANG interviews! The file includes React internals, Angular patterns, and frontend system design. 

**Should I continue with:**
1. **Behavioral/Leadership questions** with STAR examples?
2. **Database deep dive** (SQL optimization, indexing)?
3. **More production scenarios** and debugging techniques?

Let me know! 🚀
