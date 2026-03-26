# Component-Driven Architecture
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Component-driven architecture** means building UIs as a tree of independent, self-contained pieces — each component owns its markup, styles, and logic; the page is assembled by composing components, not written as one big template
- **The core principle**: a component should know how to display itself given its inputs (props), manage its own internal state, and communicate outward only through well-defined outputs (callbacks, events) — it should NOT know or care about the rest of the application
- **Atomic Design** is the most common mental model: Atoms (Button, Input) → Molecules (SearchBar = Input + Button) → Organisms (Header = Logo + SearchBar + Nav) → Templates (layout with slots) → Pages (template with real data); you build upward from small to large
- **Storybook is the tooling embodiment**: isolate every component, render it with all states (default, loading, error, empty, disabled) in isolation long before it appears in a page — this forces good component design because components that need global state to render can't be developed in isolation  
- **The senior signal**: a component is "well-designed" when you can change its implementation without changing the page; you can test it without mounting the whole app; you can reuse it in a different context with different data — this is what interviewers probe at lead level
- ✅ **Hruday's anchor**: 7 years building component libraries — SAP micro-frontend shell, Oracle Angular component library (85% test coverage), Bosch real-time dashboard widgets

---

## 1. One-Line Definition
Component-driven architecture organises UI development around building and composing independent, reusable, self-contained visual units, so that complex pages are assembled from simple, well-tested parts rather than written as monolithic templates.

---

## 2. The Problem It Solves

Before component-driven thinking, frontend code looked like this: one massive HTML template, one massive CSS file with global styles, and jQuery or vanilla JS scattered across multiple files with no clear boundaries. Adding a new feature meant hunting through 2,000 lines of template to understand context, hoping your CSS change didn't break something on another page, and guessing whether a JavaScript function was safe to reuse.

The maintenance cost compounded with team size. With 5 engineers touching the same monolithic template, merge conflicts were constant. The same UI element — a card, a badge, a dropdown — was copy-pasted in three places because nobody built it to be reusable. When the design changed, three copies needed updating. One always got missed.

The second problem was predictability. In a monolithic template, state could come from anywhere — DOM manipulation, global variables, server-rendered values, AJAX callbacks. It was impossible to reason about what a piece of UI would look like given specific data without running the whole page with the right server state.

Component-driven architecture solves both problems. Each component has a contract: given these props, render this output. The contract is testable in complete isolation (Storybook, unit tests). The boundary prevents global state leaking in. When the design changes, one component changes and all pages using it update. At Oracle, building an Angular component library with this discipline meant 85% test coverage was achievable — you simply couldn't have done that with a monolithic template approach.

---

## 3. How It Works Internally

### Atomic Design Mental Model

```
Atoms — smallest building blocks, NOT broken down further:
  <Button>
  <Input>
  <Badge>
  <Icon>
  <Avatar>
  Each has: well-typed props, all visual states (Storybook stories),
  zero knowledge of the application domain ("Submit" not "Place Order")

Molecules — composed of 2-5 atoms, single responsibility:
  <SearchBar> = <Input> + <Button> + optionally <Icon>
  <PriceTag> = <Badge> + formatted <Text>
  <UserAvatar> = <Avatar> + <Text> (name)
  Test at this level: does SearchBar emit the right search term?

Organisms — complex UI sections, might be domain-aware:
  <ProductCard> = <UserAvatar> + <PriceTag> + <Button> + image
  <NavigationHeader> = Logo + <SearchBar> + UserMenu
  <OrderTable> = column headers + rows of <OrderRow> molecules
  Test at this level: does ProductCard show correct data? Does Add to Cart work?

Templates — page structure with slots/children, NO real data:
  <DashboardLayout> = Sidebar slot + Header slot + Content slot
  Pure layout: no data fetching, no business logic, just structure
  Used for positioning and spacing consistency across pages

Pages — templates filled with real data + connected to state/API:
  <DashboardPage> = <DashboardLayout> with real user data, real metrics
  This is where routing lives, where data fetching initiates
```

### Component Contract

```
A well-designed component has a clear IN/OUT contract:

  INPUTS (Props):       What the parent provides
    - data props:       the information to display (user, product, order)
    - control props:    isLoading, isDisabled, isVisible
    - callback props:   onSubmit, onChange, onClick
    - slot props:       children (React), ng-content (Angular)

  OUTPUTS               What the component emits
    React:    calls callback props (onSubmit(value))
    Angular:  @Output() EventEmitter
    No direct parent DOM manipulation, no global state writes

  INTERNAL STATE        What only the component manages
    UI state: isMenuOpen, activeTab, inputValue (before submission)
    NOT domain state: the payment amount, the user's name — those come via props

The rule: if another component could legitimately use this, the state
belongs in the parent or a shared store, not inside this component
```

### Component Communication Patterns

```
Parent → Child: Props (data flows down)
  <ProductCard product={product} onAddToCart={handleAddToCart} />

Child → Parent: Callbacks (events flow up)
  const handleSubmit = (formData) => { ... } // defined in parent
  <OrderForm onSubmit={handleSubmit} />       // passed as prop

Sibling → Sibling: Lift state to common parent
  <ParentPage>
    <FilterPanel onFilterChange={setFilters} />
    <ProductList filters={filters} />         // shared via parent state
  </ParentPage>

Deeply nested / unrelated components: Context or State Store
  React Context: good for low-frequency updates (theme, auth, locale)
  Redux/Zustand/NgRx: good for high-frequency domain state
  Rule: prefer prop drilling for 1-2 levels; context for 3+ levels
```

---

## 4. The Code

### Wrong Way — Monolithic, Untestable Component
```tsx
// ❌ WRONG — one large component doing everything
// This is often the first draft that never gets refactored

export function DashboardPage() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [notification, setNotification] = useState('');
  
  // ❌ Data fetching mixed into UI component
  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(setUser);
    fetch('/api/orders').then(r => r.json()).then(data => {
      setOrders(data);
      setFilteredOrders(data);
    });
  }, []);
  
  // ❌ Business logic mixed into rendering code
  const handleSearch = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    setFilteredOrders(orders.filter(o => 
      o.id.includes(q) || o.customer.includes(q) // filtering logic here, untestable
    ));
  };
  
  // ❌ 200-line return block — impossible to review, test, or reuse parts of
  return (
    <div>
      <nav>
        <div onClick={() => setIsMenuOpen(!isMenuOpen)}>Menu</div>
        {isMenuOpen && <ul>...</ul>}
        <input value={searchQuery} onChange={handleSearch} />
      </nav>
      <div>Hello {user?.name}</div>
      {notification && <div>{notification}</div>}
      <table>
        {filteredOrders.map(order => (
          <tr key={order.id}>
            <td>{order.id}</td>
            <td>{order.customer}</td>
            <td>{order.amount}</td>
            {/* More TD cells... */}
          </tr>
        ))}
      </table>
    </div>
  );
}
```

> **Why this fails:** This component is impossible to test without standing up the entire API. The filtering logic is buried and untestable. The navigation menu cannot be used on any other page. Six separate concerns (auth state, order data, search, filtering, notification, navigation) are entangled in one file. A new engineer cannot understand any one part without reading all 200 lines of the file.

### Right Way — Composed, Testable, Reusable Components
```tsx
// ✅ RIGHT — every concern in its own component; well-typed contracts

// atoms/SearchInput.tsx — knows nothing about orders or domain
interface SearchInputProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;   // typed: string, not SyntheticEvent
  'aria-label': string;                // accessibility contract — required
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  placeholder = 'Search...',
  onChange,
  'aria-label': ariaLabel,
}) => (
  <input
    type="search"
    value={value}
    placeholder={placeholder}
    aria-label={ariaLabel}
    onChange={(e) => onChange(e.target.value)}  // converts Event → string for caller
    className={styles.searchInput}
  />
);

// atoms/StatusBadge.tsx
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface StatusBadgeProps {
  status: OrderStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => (
  <span
    className={styles[`badge-${status}`]}
    role="status"
    aria-label={`Order status: ${status}`}
  >
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);

// molecules/OrderRow.tsx — composed of atoms, domain-aware but single responsibility
interface Order {
  id: string;
  customerName: string;
  amount: number;
  status: OrderStatus;
  date: string;
}

interface OrderRowProps {
  order: Order;
  onViewDetails: (orderId: string) => void;
}

export const OrderRow: React.FC<OrderRowProps> = ({ order, onViewDetails }) => (
  <tr>
    <td>{order.id}</td>
    <td>{order.customerName}</td>
    <td>₹{order.amount.toLocaleString('en-IN')}</td>
    <td><StatusBadge status={order.status} /></td>
    <td>{new Date(order.date).toLocaleDateString('en-IN')}</td>
    <td>
      <button
        onClick={() => onViewDetails(order.id)}
        aria-label={`View details for order ${order.id}`}
      >
        View
      </button>
    </td>
  </tr>
);

// organisms/OrderTable.tsx
interface OrderTableProps {
  orders: Order[];
  isLoading: boolean;
  onViewOrderDetails: (orderId: string) => void;
}

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  isLoading,
  onViewOrderDetails,
}) => {
  if (isLoading) return <TableSkeleton rows={5} />;
  if (orders.length === 0) return <EmptyState message="No orders found" />;
  
  return (
    <table aria-label="Orders list">
      <thead>
        <tr>
          <th scope="col">Order ID</th>
          <th scope="col">Customer</th>
          <th scope="col">Amount</th>
          <th scope="col">Status</th>
          <th scope="col">Date</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            onViewDetails={onViewOrderDetails}
          />
        ))}
      </tbody>
    </table>
  );
};

// hooks/useOrderSearch.ts — logic extracted from component; independently testable
export const useOrderSearch = (orders: Order[]) => {
  const [query, setQuery] = useState('');
  
  const filtered = useMemo(
    () =>
      query.trim() === ''
        ? orders
        : orders.filter(
            (o) =>
              o.id.toLowerCase().includes(query.toLowerCase()) ||
              o.customerName.toLowerCase().includes(query.toLowerCase())
          ),
    [orders, query]   // recalculates only when orders or query changes
  );
  
  return { query, setQuery, filteredOrders: filtered };
};

// pages/OrdersDashboardPage.tsx — page assembles everything; thin, delegates to components
export const OrdersDashboardPage: React.FC = () => {
  const { data: orders = [], isLoading } = useOrders();   // data fetching in custom hook
  const { query, setQuery, filteredOrders } = useOrderSearch(orders);
  const navigate = useNavigate();
  
  return (
    <DashboardLayout>
      <PageHeader title="Orders">
        <SearchInput
          value={query}
          onChange={setQuery}
          aria-label="Search orders by ID or customer name"
        />
      </PageHeader>
      <OrderTable
        orders={filteredOrders}
        isLoading={isLoading}
        onViewOrderDetails={(id) => navigate(`/orders/${id}`)}
      />
    </DashboardLayout>
  );
};
```

> **Key decisions here:**
> - `SearchInput` receives `string`, not `SyntheticEvent` — the component converts the browser event internally; callers work with clean string values and don't depend on React's event system
> - `useOrderSearch` is a custom hook because the filtering logic is independently testable — `useOrderSearch(mockOrders)` can be tested without mounting any component
> - `OrderTable` accepts `isLoading` and `orders` separately — the component handles all states (loading, empty, data) so the page doesn't need conditionals
> - Every interactive element has an `aria-label` — WCAG AA accessibility built in from the start, not retrofitted

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What do you mean when you say a component is 'well-designed'?"

**Hruday's answer:**
> A well-designed component passes three tests. First, I can test it without mounting the entire application — it doesn't secretly depend on Redux store, global DOM, or a logged-in user to render. Second, I can change its implementation without touching the parent page — I can swap CSS classes, change the internal state structure, or refactor the rendering entirely, and the page doesn't know. Third, I can show it in Storybook with all its valid states — default, loading, error, empty, disabled — simultaneously, because the state is entirely controlled by props.
>
> The biggest sign of a poorly designed component is when you need to set up the entire application environment just to render it in a test. That tells me business logic has leaked in, or it's reading global state it should be receiving as a prop.
>
> At Oracle, when I built the Angular component library with 85% test coverage, this discipline was the only way that number was achievable. We were ruthless about components that required real HTTP calls or real Redux state to render. Every single one got refactored to accept mock data via inputs before we counted it as "done." That practice — isolation-by-design — is what I mean by a well-designed component.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you decide whether state should live inside a component or in a shared store?"

**Hruday's answer:**
> I use a simple set of questions.
>
> Does any other component need this state right now? If yes — it doesn't belong inside the component, it belongs in the parent or the store. An open/closed accordion state — only the accordion cares, so it stays local. The currently selected user in a dashboard — the user details panel, the action toolbar, and the breadcrumb all need it, so it lives in the store.
>
> Is this UI state or domain state? UI state is "is this dropdown open", "which tab is active", "is this form field focused" — always local. Domain state is "what is the user's name", "what items are in the cart", "what is the current order" — always shared.
>
> Does the state need to survive navigation? If a user goes to a different page and comes back, does it reset? A search query that resets on navigation: local state is fine. A shopping cart that persists across pages: store.
>
> The anti-pattern I see constantly is putting everything in Redux. When a modal's open/close state is in the Redux store, debugging becomes a nightmare — you're dispatching `OPEN_MODAL` and `CLOSE_MODAL` actions for something that should be a single `useState(false)`. Over-globalising state is just as bad as under-designing components. At SAP, our micro-frontend shell had explicit rules: any state shared across more than one micro-frontend goes in the shared Redux store; anything inside one micro-frontend stays local.

---

### Q3 — Trade-Off
**Interviewer asks:** "When does component-driven architecture make things harder instead of easier?"

**Hruday's answer:**
> Component-driven architecture adds cost upfront for small, low-frequency UIs. If you have a one-off admin page that three people use, decomposing it into atoms, molecules, and organisms is over-engineering. You'll spend more time designing the component hierarchy than building the actual page. A single, honest component for that page is often the right call.
>
> The second challenge is over-abstraction. Developers new to the principle can create too many tiny components — an `<H2>` component, a `<Bold>` component — where the JSX verbosity cost of the component tree exceeds the reuse benefit. The rule of thumb: a component earns its existence when it's either used in more than one place, OR when isolating it makes the parent meaningfully simpler to understand.
>
> The third challenge is prop drilling — the pain of passing data through 5 levels of components. This is a real friction point that pushes teams towards over-using Context or Redux too early. The answer isn't to stop decomposing components — it's to apply composition patterns (render props, children-as-functions, slot patterns) and to place state at the right level: not one level up, but as close to the components that need it as possible while still being accessible.
>
> At SAP, our micro-frontend shell had ~80 reusable components in the shared library. The overhead paid off — any new micro-frontend team got a full design-system-compliant UI on day one. But we were disciplined about what entered the shared library. Anything used in only one micro-frontend stayed local.

---

### Q4 — Scenario
**Interviewer asks:** "Design the component architecture for an order management dashboard with filtering, sorting, and pagination."

**Hruday's answer:**
> I'd start from the user experience and decompose outward.
>
> The page has a header with a search input and filter dropdowns; a table of orders with sortable column headers, a row per order; and pagination controls below. That's three main organisms: `<OrderFilters>`, `<OrderTable>`, `<Pagination>`.
>
> The `<OrderTable>` organism contains `<OrderTableHeader>` (a molecule with sortable column headers — emits `onSort(column, direction)`) and rows of `<OrderRow>` molecules (each composed of a `<StatusBadge>` atom and a `<CurrencyAmount>` atom).
>
> State distribution: the search query, active filters, current sort column/direction, and current page number are all URL state — I'd put them in the URL query string via `useSearchParams`. This makes the filtered/sorted view bookmarkable and shareable, and Back/Forward navigation works correctly. The data fetch derives from these URL parameters.
>
> Data fetching via TanStack Query: `useOrders({ search, filters, sort, page })` returns `{ data, isLoading, error }`. The page component calls this hook and passes the results down to `<OrderTable>`. No Redux needed — TanStack Query is the server state layer.
>
> The result: `<OrderTable>` is completely testable with mock data, the URL captures the full filter state, and all filter/sort/page changes are a URL update — no complex local state synchronisation.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Components should be small" | "I try to keep components under 100 lines" | Size is a symptom, not a rule — a complex, well-structured component can be 200 lines and be excellent; an 80-line component with three responsibilities is bad design; the question is: does this component have one clear reason to change? |
| "props drilling is the problem" | "I use Context to avoid prop drilling" | Context re-renders every consumer on every value change — it's not free; prop drilling for 2-3 levels is fine; for deeper trees, use component composition (pass elements as props, not just data) or a state store; context is good for low-frequency updates (theme, auth state, locale) |
| "Reusable means generic" | "I make components configurable with many props" | A component with 20 props is a framework, not a component — it's impossible to understand and test; prefer composability over configurability: build a simple component and let consumers compose it with other simple components; two small focused components are always better than one large configurable one |
| "State always goes in the store" | "We put all state in Redux at my company" | A modal's open/close state in Redux means dispatching actions for what should be `useState(false)` — this creates debugging noise and violates encapsulation; start with local state; elevate to shared store only when genuinely needed across component trees, not by default |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I designed and built the shared component library for our micro-frontend shell — used across 6 independently deployed micro-frontends. The discipline that made it work was Storybook-first development: every component had stories for all its states before any integration happened. This forced us to design clean prop APIs — if a component couldn't be rendered in Storybook without real Redux state or a real HTTP call, we had a design problem, not a Storybook problem.
>
> The result was that new micro-frontend teams could build features on day one using shared components with zero setup. When we updated a component — say, the `StatusBadge` with a new 'on-hold' status variant — all six micro-frontends got the update on their next build with zero code changes on their side. That's what component-driven architecture at scale actually looks like."

---

## 8. Scale Evolution

**Solo dev, simple app →** Component decomposition is still valuable but lighter — split into Page → Section → Component three levels maximum; don't build a Storybook; co-locate styles with components; functional components with hooks exclusively.

**Team of 5, single repo →** Establish a `components/` folder with atoms/molecules/organisms structure; a shared `hooks/` folder for reusable logic; Storybook for the shared component library; PropTypes (JavaScript) or TypeScript interfaces enforced; coding review checklist: "can I test this component without the full app?"

**Multi-team, mono-repo or micro-frontends →** Dedicated shared component library as a separate package (or Nx library); versioned component releases; Chromatic for visual regression testing on every PR; strict component API review process before any breaking prop change; design tokens for theme consistency; component usage analytics to track and deprecate unused components.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment UI components (OTP input, card input, UPI flow) must be pixel-perfect, accessible, and shareable across web and React Native — strong component library discipline is foundational | Show understanding of controlled vs uncontrolled inputs; accessibility in form components; design system integration |
| Swiggy / Meesho | High-velocity product teams shipping features weekly; a strong component library prevents UI drift and duplication; search, product card, filter components are reused across dozens of pages | Show how Storybook + component versioning enables team autonomy without inconsistency |
| Adobe / Microsoft | Adobe Spectrum and Microsoft FluentUI are world-class component libraries; engineers at these companies are expected to build to that standard — accessibility, theming, i18n, RTL support baked in | Know WCAG AA requirements for components; theming via CSS variables; compound component patterns |
| SAP Labs | Direct experience: built SAP micro-frontend shared library; Storybook-first discipline; component consumption across 6 micro-frontends | Anchor real SAP story — Storybook-first, shared library, micro-frontend integration |

---

## 10. Related Topics — What to Study Next

- **Topic 201 — Micro-Frontend Architecture with Module Federation** — the logical extension of component-driven architecture at the team/deployment boundary; when components are shared across independently deployed apps instead of within a monorepo, Module Federation is the mechanism; same principles (clear API contracts, isolation) apply at app level
- **Topic 210 — All React Hooks** — hooks are the fundamental tool for extracting stateful logic OUT of components; `useCallback` + `useMemo` make prop stability possible (preventing unnecessary re-renders); `useContext` is the React standard for sharing state without prop drilling; understanding hooks deeply is the same skill as understanding component design deeply
- **Topic 213 — Custom Hooks: Patterns and Composition** — custom hooks are the component-driven approach applied to LOGIC, not just UI; `useOrderSearch`, `useFormValidation`, `useDebounce` follow the same isolation principle as components; testable in isolation, composable, single responsibility
- **Topic 234 — Core Web Vitals** — component architecture decisions directly impact LCP (is the main content component server-rendered or delayed by a heavy parent?), CLS (do components reserve space before image loads?), and INP (are interaction handlers in deeply nested components causing long tasks?)
- **Topic 314 — Design System Architecture** — a design system is the company-wide formalisation of component-driven architecture; Storybook, design tokens, component versioning, documentation, and WCAG are how component libraries become design systems

---

*Part 12 · Component-Driven Architecture · Full Stack Interview Guide · Hruday D · 2026*
