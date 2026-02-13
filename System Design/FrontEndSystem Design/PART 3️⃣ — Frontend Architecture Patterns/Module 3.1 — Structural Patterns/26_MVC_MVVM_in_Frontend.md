# 26. MVC / MVVM in Frontend

## 1. High-Level Explanation (Frontend Interview Level)

**MVC (Model-View-Controller)** and **MVVM (Model-View-ViewModel)** are architectural patterns that **separate concerns** in frontend applications—**Model** (data/business logic), **View** (UI/presentation), **Controller/ViewModel** (mediator/glue logic)—enabling organized code, testability, and maintainability by defining clear responsibilities.

**MVC**: View → Controller → Model (user interaction triggers controller, which updates model and view)  
**MVVM**: View ↔ ViewModel ↔ Model (two-way data binding, ViewModel exposes model data to view)

**Key Principle**: "Separate data (Model), presentation (View), and coordination logic (Controller/ViewModel)—clear boundaries enable parallel development, easy testing, and scalability."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### MVC (Model-View-Controller)

**Origin**: Smalltalk (1970s), popularized by Ruby on Rails (backend), adapted to frontend (Backbone.js).

**Components**:

#### 1. **Model** (Data + Business Logic)

**Responsibilities**:
- Store application data
- Business logic (validation, calculations)
- Notify observers when data changes

**Example**:
```javascript
// Model: User data
class UserModel {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.observers = [];
  }
  
  // Business logic
  validate() {
    if (!this.email.includes('@')) {
      throw new Error('Invalid email');
    }
  }
  
  // Update data
  update(data) {
    Object.assign(this, data);
    this.validate();
    this.notify();  // Notify View of changes
  }
  
  // Observer pattern
  subscribe(observer) {
    this.observers.push(observer);
  }
  
  notify() {
    this.observers.forEach(obs => obs(this));
  }
}
```

---

#### 2. **View** (Presentation/UI)

**Responsibilities**:
- Display data from Model
- Capture user input (clicks, typing)
- Delegate logic to Controller

**Example**:
```javascript
// View: User profile UI
class UserView {
  constructor(model, controller) {
    this.model = model;
    this.controller = controller;
    
    // Subscribe to Model changes
    this.model.subscribe(() => this.render());
    
    // Initial render
    this.render();
  }
  
  render() {
    const html = `
      <div class="user-profile">
        <h2>${this.model.name}</h2>
        <p>${this.model.email}</p>
        <button id="edit-btn">Edit</button>
      </div>
    `;
    
    document.getElementById('app').innerHTML = html;
    
    // Attach event listeners (delegate to Controller)
    document.getElementById('edit-btn').addEventListener('click', () => {
      this.controller.handleEdit();
    });
  }
}
```

---

#### 3. **Controller** (Coordination Logic)

**Responsibilities**:
- Handle user input from View
- Update Model
- Update View (trigger re-render)

**Example**:
```javascript
// Controller: User actions
class UserController {
  constructor(model) {
    this.model = model;
  }
  
  handleEdit() {
    const newName = prompt('Enter new name:');
    const newEmail = prompt('Enter new email:');
    
    try {
      // Update Model (business logic)
      this.model.update({ name: newName, email: newEmail });
      // View automatically updates (observer pattern)
    } catch (error) {
      alert(error.message);
    }
  }
  
  handleDelete() {
    if (confirm('Delete user?')) {
      // Call API (Model responsibility)
      this.model.delete();
    }
  }
}
```

---

**MVC Flow**:
```
User clicks "Edit" button:
  ↓
View captures event
  ↓
View calls Controller.handleEdit()
  ↓
Controller prompts for new data
  ↓
Controller calls Model.update(data)
  ↓
Model validates data
  ↓
Model notifies observers (View)
  ↓
View re-renders with new data
```

---

### MVVM (Model-View-ViewModel)

**Origin**: Microsoft (2005), used in WPF, popularized by Angular, Vue, Knockout.js.

**Components**:

#### 1. **Model** (Data + Business Logic)

**Same as MVC**: Store data, business logic, validation.

```javascript
// Model: User data
class UserModel {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
  }
  
  validate() {
    if (!this.email.includes('@')) {
      throw new Error('Invalid email');
    }
  }
}
```

---

#### 2. **View** (Presentation/UI with Bindings)

**Responsibilities**:
- Display data via **data binding** (declarative)
- No manual DOM manipulation (framework handles)

**Example** (Vue.js):
```html
<!-- View: Declarative UI -->
<template>
  <div class="user-profile">
    <h2>{{ name }}</h2>  <!-- Two-way binding -->
    <input v-model="email" />  <!-- Two-way binding -->
    <button @click="handleSave">Save</button>
  </div>
</template>
```

---

#### 3. **ViewModel** (View Logic + Data Transformation)

**Responsibilities**:
- Expose Model data to View (transformed for display)
- Handle View events
- Two-way data binding (View ↔ ViewModel)

**Example** (Vue.js):
```javascript
// ViewModel: Vue component
export default {
  data() {
    return {
      user: new UserModel({ id: 1, name: 'Alice', email: 'alice@example.com' }),
    };
  },
  
  computed: {
    // Transform Model data for View
    name() {
      return this.user.name.toUpperCase();  // Display name in uppercase
    },
    email: {
      get() { return this.user.email; },
      set(value) { this.user.email = value; }  // Two-way binding
    }
  },
  
  methods: {
    // Handle View events
    handleSave() {
      try {
        this.user.validate();
        api.saveUser(this.user);  // Call API
      } catch (error) {
        alert(error.message);
      }
    }
  }
}
```

---

**MVVM Flow** (Two-Way Binding):
```
User types in input:
  ↓
View updates ViewModel (via binding)
  ↓
ViewModel updates Model
  ↓
Model notifies ViewModel
  ↓
ViewModel updates View (via binding)
  ↓
View re-renders automatically
```

---

### MVC vs MVVM

| Aspect | MVC | MVVM |
|--------|-----|------|
| **View-Controller/ViewModel** | View calls Controller manually | View binds to ViewModel declaratively |
| **Data Flow** | One-way (View → Controller → Model) | Two-way (View ↔ ViewModel ↔ Model) |
| **DOM Manipulation** | Manual (View updates DOM) | Automatic (framework handles) |
| **Testability** | Controller testable (unit tests) | ViewModel testable (no DOM) |
| **Complexity** | Simpler (explicit) | More complex (implicit bindings) |
| **Frameworks** | Backbone.js (legacy) | Angular, Vue, Knockout |

---

### MVC in Frontend (Backbone.js Example)

**Backbone.js** (2010): Early MVC framework for frontend.

**Structure**:
```javascript
// Model
const User = Backbone.Model.extend({
  defaults: { name: '', email: '' },
  
  validate(attrs) {
    if (!attrs.email.includes('@')) {
      return 'Invalid email';
    }
  }
});

// View
const UserView = Backbone.View.extend({
  template: _.template('<h2><%= name %></h2><p><%= email %></p>'),
  
  events: {
    'click .edit-btn': 'handleEdit'  // Declarative event binding
  },
  
  initialize() {
    this.listenTo(this.model, 'change', this.render);  // Subscribe to Model changes
  },
  
  render() {
    this.$el.html(this.template(this.model.toJSON()));
    return this;
  },
  
  handleEdit() {
    // Update Model
    this.model.set({ name: prompt('New name:') });
  }
});

// Controller (implicit in Backbone)
const user = new User({ name: 'Alice', email: 'alice@example.com' });
const view = new UserView({ model: user });
view.render();
```

**Pros**:
- Separation of concerns (Model, View, Controller implicit)
- Observer pattern (View updates when Model changes)

**Cons**:
- Manual DOM manipulation (View updates DOM directly)
- Boilerplate (lots of setup code)
- No two-way binding (must manually sync View ↔ Model)

**Why Declined**: React/Vue/Angular provided simpler, more declarative approaches (component-based, two-way binding, virtual DOM).

---

### MVVM in Frontend (Vue.js Example)

**Vue.js** (2014): Modern MVVM framework.

**Structure**:
```vue
<!-- View (template) -->
<template>
  <div class="user-profile">
    <h2>{{ user.name }}</h2>
    <input v-model="user.email" />  <!-- Two-way binding -->
    <button @click="saveUser">Save</button>
  </div>
</template>

<script>
// ViewModel (Vue component)
export default {
  data() {
    return {
      user: { name: 'Alice', email: 'alice@example.com' }  // Model
    };
  },
  
  methods: {
    // Handle events
    saveUser() {
      api.saveUser(this.user);
    }
  }
}
</script>
```

**Pros**:
- **Declarative**: Two-way binding (`v-model`, `{{ }}`)
- **Reactive**: View updates automatically when data changes
- **Less boilerplate**: No manual DOM manipulation

**Cons**:
- **Magic**: Implicit bindings (harder to debug)
- **Performance**: Reactivity overhead (watchers, dirty checking)

---

### MVVM in Angular

**Angular (2+)** (2016): TypeScript-based MVVM framework.

**Structure**:
```typescript
// Model
interface User {
  name: string;
  email: string;
}

// ViewModel (Angular component)
@Component({
  selector: 'user-profile',
  template: `
    <div class="user-profile">
      <h2>{{ user.name }}</h2>
      <input [(ngModel)]="user.email" />  <!-- Two-way binding -->
      <button (click)="saveUser()">Save</button>
    </div>
  `
})
export class UserProfileComponent {
  user: User = { name: 'Alice', email: 'alice@example.com' };  // Model
  
  constructor(private userService: UserService) {}
  
  saveUser() {
    this.userService.save(this.user);
  }
}

// Service (Model layer)
@Injectable()
export class UserService {
  saveUser(user: User): Observable<User> {
    return this.http.post('/api/users', user);
  }
}
```

**Pros**:
- **TypeScript**: Type safety (catch errors at compile time)
- **Dependency Injection**: Services easily testable
- **RxJS**: Reactive programming (Observables for async data)

**Cons**:
- **Complexity**: Steep learning curve (decorators, DI, RxJS)
- **Boilerplate**: Lots of setup code
- **Performance**: Slow initial load (large framework ~1MB)

---

### React: Not MVC or MVVM

**React** (2013): Component-based (not strictly MVC or MVVM).

**Structure**:
```jsx
// React component (View + ViewModel merged)
function UserProfile() {
  // State (Model-like)
  const [user, setUser] = useState({ name: 'Alice', email: 'alice@example.com' });
  
  // Event handler (Controller-like)
  const handleSave = () => {
    api.saveUser(user);
  };
  
  // Template (View)
  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <input 
        value={user.email} 
        onChange={e => setUser({ ...user, email: e.target.value })}  // Manual binding
      />
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

**Difference**:
- **No strict separation**: Component = View + ViewModel + some Model logic
- **Unidirectional data flow**: Props down, events up (not two-way binding)
- **Explicit**: Manual bindings (no magic)

**Why React Succeeded**:
- **Simplicity**: Less boilerplate than MVC/MVVM frameworks
- **Performance**: Virtual DOM (efficient re-renders)
- **Flexibility**: Not opinionated (choose state management, routing, etc.)

---

### Modern Frontend: Beyond MVC/MVVM

**Current Trend**: Component-based + State Management (Redux/Zustand).

**Structure**:
```
Components (View + ViewModel):
├── UserProfile.jsx       (display user)
├── UserForm.jsx          (edit user)
└── UserList.jsx          (list users)

State Management (Model):
├── store/
│   ├── userSlice.js      (Redux slice: actions, reducers)
│   └── store.js          (global store)

Services (API layer):
└── services/
    └── userService.js    (fetch/save users)
```

**Example** (React + Redux):
```jsx
// State Management (Model)
const userSlice = createSlice({
  name: 'user',
  initialState: { name: '', email: '' },
  reducers: {
    updateUser(state, action) {
      Object.assign(state, action.payload);
    }
  }
});

// Component (View + ViewModel)
function UserProfile() {
  const user = useSelector(state => state.user);  // Read from Model
  const dispatch = useDispatch();
  
  const handleSave = () => {
    dispatch(updateUser({ name: 'Alice', email: 'alice@example.com' }));
  };
  
  return (
    <div>
      <h2>{user.name}</h2>
      <input 
        value={user.email} 
        onChange={e => dispatch(updateUser({ email: e.target.value }))}
      />
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

**Benefits**:
- **Separation**: Components (UI) ↔ State Management (data) ↔ Services (API)
- **Testability**: Test components, state, services independently
- **Scalability**: Centralized state (predictable data flow)

---

## 3. Clear Real-World Examples

### Example 1: **Backbone.js (MVC) — Twitter (2010-2013)**

**Architecture**: MVC (Backbone.js).

**Structure**:
```javascript
// Model: Tweet
const Tweet = Backbone.Model.extend({
  defaults: { text: '', likes: 0 }
});

// Collection: Timeline
const Timeline = Backbone.Collection.extend({
  model: Tweet,
  url: '/api/tweets'
});

// View: Tweet
const TweetView = Backbone.View.extend({
  template: _.template('<p><%= text %></p><button class="like">Like (<%= likes %>)</button>'),
  
  events: {
    'click .like': 'handleLike'
  },
  
  initialize() {
    this.listenTo(this.model, 'change', this.render);
  },
  
  render() {
    this.$el.html(this.template(this.model.toJSON()));
    return this;
  },
  
  handleLike() {
    this.model.set({ likes: this.model.get('likes') + 1 });
    this.model.save();  // Save to API
  }
});
```

**Problems**:
- Manual DOM manipulation (slow, error-prone)
- Boilerplate (lots of code for simple tasks)
- No two-way binding (must manually sync View ↔ Model)

**Migration**: Twitter migrated to React (2013-2015) for better performance and developer experience.

---

### Example 2: **Angular (MVVM) — Google Ads Dashboard**

**Architecture**: MVVM (Angular 2+).

**Structure**:
```typescript
// Service (Model layer)
@Injectable()
export class CampaignService {
  getCampaigns(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>('/api/campaigns');
  }
}

// Component (ViewModel)
@Component({
  selector: 'campaign-dashboard',
  template: `
    <div *ngFor="let campaign of campaigns$ | async">  <!-- Async pipe (reactive) -->
      <h3>{{ campaign.name }}</h3>
      <p>Budget: {{ campaign.budget | currency }}</p>  <!-- Pipe (transform data) -->
      <button (click)="editCampaign(campaign)">Edit</button>
    </div>
  `
})
export class CampaignDashboardComponent {
  campaigns$: Observable<Campaign[]>;  // Observable (reactive data)
  
  constructor(private campaignService: CampaignService) {
    this.campaigns$ = this.campaignService.getCampaigns();
  }
  
  editCampaign(campaign: Campaign) {
    // Open edit modal
  }
}
```

**Benefits**:
- **TypeScript**: Type safety (catch errors at compile time)
- **RxJS**: Reactive programming (async data streams)
- **Dependency Injection**: Services easily testable (mock CampaignService)

---

### Example 3: **Vue (MVVM) — Alibaba Admin Panel**

**Architecture**: MVVM (Vue.js).

**Structure**:
```vue
<!-- Component (View + ViewModel) -->
<template>
  <div class="product-list">
    <input v-model="searchQuery" placeholder="Search products" />  <!-- Two-way binding -->
    
    <div v-for="product in filteredProducts" :key="product.id">
      <h3>{{ product.name }}</h3>
      <p>{{ product.price | currency }}</p>  <!-- Filter (transform data) -->
      <button @click="editProduct(product)">Edit</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      products: [],  // Model
      searchQuery: ''
    };
  },
  
  computed: {
    // Transform Model data for View
    filteredProducts() {
      return this.products.filter(p => 
        p.name.includes(this.searchQuery)
      );
    }
  },
  
  methods: {
    editProduct(product) {
      this.$router.push(`/products/${product.id}/edit`);
    }
  },
  
  async mounted() {
    this.products = await api.getProducts();  // Fetch data
  }
}
</script>
```

**Benefits**:
- **Two-way binding**: `v-model` (simple, reactive)
- **Computed properties**: Derived data (filtered products)
- **Declarative**: Template syntax (easy to read)

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "Explain MVC and MVVM in frontend."

**Answer**:

"**MVC (Model-View-Controller)** and **MVVM (Model-View-ViewModel)** are architectural patterns that **separate concerns** in frontend applications—**Model** (data/business logic), **View** (UI/presentation), **Controller/ViewModel** (coordination logic)—enabling organized code, testability, and maintainability.

---

### MVC (Model-View-Controller)

**Components**:

**1. Model** (Data + Business Logic):
- Store application data (`User`, `Product`)
- Business logic (validation, calculations)
- Notify observers when data changes (observer pattern)

**2. View** (Presentation):
- Display data from Model
- Capture user input (clicks, typing)
- Delegate logic to Controller (no business logic)

**3. Controller** (Coordination):
- Handle user input from View
- Update Model (business logic)
- Update View (trigger re-render)

**Flow**:
```
User clicks button
  ↓
View captures event
  ↓
View calls Controller.handleClick()
  ↓
Controller updates Model
  ↓
Model notifies View (observer pattern)
  ↓
View re-renders
```

**Example** (Backbone.js, 2010):
```javascript
// Model
const User = Backbone.Model.extend({
  defaults: { name: '', email: '' }
});

// View
const UserView = Backbone.View.extend({
  events: {
    'click .save-btn': 'handleSave'  // Delegate to Controller
  },
  
  initialize() {
    this.listenTo(this.model, 'change', this.render);  // Observer
  },
  
  render() {
    this.$el.html('<h2>' + this.model.get('name') + '</h2>');  // Manual DOM
    return this;
  },
  
  handleSave() {
    this.model.set({ name: 'Alice' });  // Update Model
  }
});
```

**Pros**:
- Separation of concerns (Model, View, Controller)
- Testability (test Controller without View)

**Cons**:
- Manual DOM manipulation (slow, error-prone)
- Boilerplate (lots of setup code)
- No two-way binding (must manually sync View ↔ Model)

---

### MVVM (Model-View-ViewModel)

**Components**:

**1. Model** (Data + Business Logic):
- Same as MVC (store data, business logic)

**2. View** (Presentation with Bindings):
- Display data via **declarative bindings** (`{{ name }}`, `v-model`)
- No manual DOM manipulation (framework handles)

**3. ViewModel** (View Logic + Data Transformation):
- Expose Model data to View (transformed for display)
- Handle View events
- **Two-way data binding** (View ↔ ViewModel)

**Flow** (Two-Way Binding):
```
User types in input
  ↓
View updates ViewModel (automatic binding)
  ↓
ViewModel updates Model
  ↓
Model notifies ViewModel
  ↓
ViewModel updates View (automatic binding)
  ↓
View re-renders
```

**Example** (Vue.js, 2014):
```vue
<!-- View (template with bindings) -->
<template>
  <div>
    <h2>{{ user.name }}</h2>  <!-- One-way binding -->
    <input v-model="user.email" />  <!-- Two-way binding -->
    <button @click="saveUser">Save</button>
  </div>
</template>

<script>
// ViewModel (Vue component)
export default {
  data() {
    return {
      user: { name: 'Alice', email: 'alice@example.com' }  // Model
    };
  },
  
  methods: {
    saveUser() {
      api.saveUser(this.user);  // Update Model
    }
  }
}
</script>
```

**Pros**:
- **Declarative**: Two-way binding (`v-model`, `{{ }}`)
- **Reactive**: View updates automatically when data changes
- **Less boilerplate**: No manual DOM manipulation

**Cons**:
- **Magic**: Implicit bindings (harder to debug)
- **Performance**: Reactivity overhead (watchers, dirty checking)

---

### MVC vs MVVM

| Aspect | MVC | MVVM |
|--------|-----|------|
| **Data Flow** | One-way (View → Controller → Model) | Two-way (View ↔ ViewModel ↔ Model) |
| **DOM** | Manual (View updates DOM) | Automatic (framework bindings) |
| **Bindings** | Explicit (View calls Controller) | Implicit (declarative bindings) |
| **Testability** | Controller testable | ViewModel testable (no DOM) |
| **Frameworks** | Backbone.js (legacy) | Angular, Vue, Knockout |

---

### React: Not MVC or MVVM

**React** (2013): Component-based (not strictly MVC or MVVM).

**Structure**:
```jsx
function UserProfile() {
  // State (Model-like)
  const [user, setUser] = useState({ name: 'Alice', email: 'alice@example.com' });
  
  // Event handler (Controller-like)
  const handleSave = () => api.saveUser(user);
  
  // Template (View)
  return (
    <div>
      <h2>{user.name}</h2>
      <input 
        value={user.email} 
        onChange={e => setUser({ ...user, email: e.target.value })}  // Manual
      />
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

**Difference**:
- **No strict separation**: Component = View + ViewModel + some Model logic
- **Unidirectional data flow**: Props down, events up (not two-way binding)
- **Explicit**: Manual bindings (no magic)

**Why React Succeeded**:
- Simplicity (less boilerplate than MVC/MVVM)
- Performance (Virtual DOM)
- Flexibility (not opinionated, choose state management)

---

### Modern Frontend: Component + State Management

**Current Trend**: Component-based + Redux/Zustand (centralized state).

**Structure**:
```
Components (View + ViewModel):
├── UserProfile.jsx
└── UserList.jsx

State Management (Model):
├── store/userSlice.js    (Redux: actions, reducers)
└── store/store.js

Services (API):
└── services/userService.js
```

**Benefits**:
- Separation: Components (UI) ↔ State (data) ↔ Services (API)
- Testability: Test components, state, services independently
- Scalability: Centralized state (predictable data flow)

---

### Real-World

**Twitter (2010-2013)**: Backbone.js (MVC) → manual DOM, boilerplate → migrated to React (2013-2015) for performance and DX.

**Google Ads Dashboard**: Angular (MVVM) → TypeScript (type safety), RxJS (reactive), Dependency Injection (testability).

**Alibaba Admin Panel**: Vue (MVVM) → two-way binding (`v-model`), computed properties (derived data), declarative templates.

---

**Follow-up I Expect**:

Q: 'Why did MVC decline in frontend?'
A: **Manual DOM manipulation**: Backbone.js (MVC) requires manual DOM updates (slow, error-prone). Example: `this.$el.html('<h2>' + name + '</h2>')` (XSS risk, performance issues). **Boilerplate**: Lots of setup code (models, views, controllers, event bindings). **No two-way binding**: Must manually sync View ↔ Model (tedious). **Solution**: React/Vue/Angular provided simpler, more declarative approaches (component-based, two-way binding, virtual DOM).

Q: 'MVVM vs React?'
A: **MVVM (Vue/Angular)**: Two-way binding (automatic View ↔ ViewModel sync, `v-model`, `[(ngModel)]`), declarative templates, reactive (magic). **React**: Unidirectional data flow (props down, events up, explicit), manual bindings (`value={user.email} onChange={...}`), Virtual DOM (efficient re-renders). **Trade-off**: MVVM = simpler (less code, two-way binding), React = more predictable (explicit data flow, easier to debug).

Q: 'When to use MVC/MVVM?'
A: **Rarely in modern frontend**: MVC (Backbone.js) legacy, MVVM (Angular/Vue) specific frameworks. **Modern**: Component-based (React) + state management (Redux/Zustand). **Use case**: **Angular enterprise apps** (TypeScript, DI, RxJS), **Vue small-medium apps** (two-way binding, simplicity). **Avoid**: New projects → use React (flexibility, ecosystem)."

---

## 5. Code Examples

See Deep-Dive section for comprehensive examples covering:
- MVC (Backbone.js): Model, View, Controller
- MVVM (Vue.js, Angular): Model, View, ViewModel, two-way binding
- React (component-based): Not strictly MVC/MVVM
- Modern approach: Component + State Management (Redux)

---

## 6. Why & How Summary

### Why It Matters

**Separation of Concerns**: Organize code by responsibility (Model data/business logic, View presentation/UI, Controller/ViewModel coordination/glue logic, clear boundaries enable parallel development easy testing maintainability)  
**Historical Context**: MVC Backbone.js early frontend framework (2010-2013 Twitter) declined due to manual DOM boilerplate no two-way binding, MVVM Angular Vue popularized two-way binding reactive declarative templates, React component-based unified View+ViewModel explicit unidirectional data flow succeeded due to simplicity performance flexibility  
**Modern Patterns**: Current trend component-based (React Vue) + state management (Redux Zustand MobX) centralized state predictable data flow, separation: Components UI ↔ State data ↔ Services API, testability: test components state services independently

### How It Works

**MVC**: Model (store data business logic notify observers when changes), View (display data capture user input delegate to Controller no business logic), Controller (handle user input from View update Model trigger View re-render), flow: User clicks → View captures → Controller handles → Model updates → Model notifies View → View re-renders, example: Backbone.js manual DOM `this.$el.html()` observer pattern `listenTo(model, 'change', render)`, cons: manual DOM slow error-prone, boilerplate lots of setup, no two-way binding  
**MVVM**: Model (same as MVC data business logic), View (display via declarative bindings `{{ name }}` `v-model` no manual DOM framework handles), ViewModel (expose Model data to View transformed, handle View events, two-way data binding View ↔ ViewModel automatic), flow: User types → View updates ViewModel automatic → ViewModel updates Model → Model notifies ViewModel → ViewModel updates View automatic → View re-renders, example: Vue `<input v-model="user.email" />` Angular `[(ngModel)]="user.email"`, pros: declarative reactive less boilerplate, cons: magic implicit bindings harder to debug, performance reactivity overhead watchers dirty checking  
**MVC vs MVVM**: MVC one-way data flow manual DOM explicit bindings, MVVM two-way data flow automatic DOM implicit declarative bindings, both: testability Controller/ViewModel testable without View DOM  
**React Not MVC/MVVM**: Component-based not strict separation (component = View + ViewModel + some Model), unidirectional data flow (props down events up not two-way binding), explicit manual bindings (`value={email} onChange={...}` no magic), why succeeded: simplicity less boilerplate, performance Virtual DOM efficient re-renders, flexibility not opinionated choose state management routing  
**Modern Approach**: Component-based (React Vue) + state management (Redux Zustand centralized state), structure: Components View+ViewModel, State Management Model (actions reducers), Services API layer, benefits: separation Components UI ↔ State data ↔ Services API, testability test independently, scalability centralized state predictable data flow

**FAANG Expectation**: Define MVC (Model data/business logic, View presentation/UI, Controller coordination/glue logic, flow: User → View → Controller → Model → View), define MVVM (Model data, View declarative bindings, ViewModel expose data handle events two-way binding View ↔ ViewModel, flow: User → View automatic ViewModel → Model → ViewModel automatic View), compare MVC vs MVVM (MVC one-way manual DOM explicit, MVVM two-way automatic DOM implicit declarative), explain React not MVC/MVVM (component-based not strict separation, unidirectional data flow props down events up, explicit manual bindings, why succeeded: simplicity performance flexibility), modern approach (component + state management Redux/Zustand, separation: Components UI State data Services API, testability scalability), historical context (MVC Backbone.js declined due to manual DOM boilerplate, MVVM Angular Vue two-way binding reactive, React unified View+ViewModel simpler), real-world examples (Twitter Backbone.js migrated to React, Google Ads Angular TypeScript RxJS DI, Alibaba Vue two-way binding computed properties), when to use (rarely in modern frontend, Angular enterprise apps TypeScript DI, Vue small-medium apps two-way binding simplicity, modern: React + Redux flexibility ecosystem)
