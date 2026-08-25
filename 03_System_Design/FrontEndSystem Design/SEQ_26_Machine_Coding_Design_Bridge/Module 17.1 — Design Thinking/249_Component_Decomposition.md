# 249 – Component Decomposition

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Component Decomposition is the process of breaking a UI into a tree of smaller, focused components — each with a single responsibility, clear inputs (props), and predictable behavior. In machine coding rounds, this is the FIRST thing interviewers evaluate: can you look at a UI mockup and immediately identify the component hierarchy? It tests your ability to think in **composition** (small components assembled into larger ones), **separation of concerns** (data fetching vs presentation vs interaction), and **reusability** (components that work in multiple contexts). Getting decomposition right makes the rest of the implementation straightforward.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### The Decomposition Process

1. **Start with the UI** — Identify visual groupings (boxes within boxes)
2. **Apply Single Responsibility** — Each component does ONE thing
3. **Identify data flow** — Which component owns what state?
4. **Extract reusable pieces** — Buttons, inputs, cards become generic
5. **Define the API (props)** — What does each component need from its parent?

### Example: Decomposing a Product Card

```
ProductCard
├── ProductImage          ← lazy loaded, aspect-ratio preserved
├── ProductInfo
│   ├── ProductTitle      ← truncated with ellipsis
│   ├── ProductPrice      ← currency formatting
│   └── ProductRating     ← star display
├── AddToCartButton       ← loading state, disabled when out of stock
└── WishlistToggle        ← optimistic toggle
```

### Three Component Categories

| Category | Purpose | Example |
|----------|---------|---------|
| **Container / Smart** | Fetches data, manages state, connects to store | `ProductListContainer` |
| **Presentational / Dumb** | Renders UI based on props, no side effects | `ProductCard`, `StarRating` |
| **Utility / Headless** | Provides behavior without rendering | `useIntersectionObserver`, `useDebounce` |

### Decision Framework: When to Split

Split a component when:
- It has more than ~200 lines
- It manages unrelated pieces of state
- Part of it is reusable elsewhere
- It has multiple conditional renders for different "modes"
- Testing it requires mocking too many things

DON'T split when:
- The "component" would have 1 line of JSX
- Splitting adds prop drilling without benefit
- The pieces are never used independently

### Anti-Patterns

- ❌ **God Components**: One massive component with 500+ lines, 20+ state variables
- ❌ **Premature Abstraction**: Creating `<Text>` wrapper around `<span>` for "reusability"
- ❌ **Prop Drilling Hell**: 5+ levels of passing props — use context or composition
- ❌ **Over-splitting**: Every `<div>` becomes a component — adds indirection without value
- ❌ **Leaky Abstractions**: Child component needs to know about parent's implementation details

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: React's Own Component Model
React's component model was designed specifically FOR decomposition. The React docs use the "thinking in React" approach: draw boxes around every component in the UI mockup, then build from the bottom up. Facebook/Meta uses this consistently across their products.

### Hruday @ SAP Labs
At SAP, Fiori apps follow strict component decomposition via the MVC pattern — each view is composed of UI5 controls (components). Our micro-frontend architecture at SAP took this further: each micro-frontend is a self-contained component tree with its own data fetching and state management. This decomposition discipline enabled independent team ownership.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"When I see a UI mockup, I immediately draw mental boxes around each distinct section. I start from the outermost container and work inward, asking: does this section have its own data, its own interaction, or could it be reused?*

*I categorize components into three types: containers (fetch data, manage state), presentational (render UI from props), and headless hooks (reusable behavior without UI). This separation makes testing straightforward — presentational components are pure functions of props.*

*For prop design, I follow the 'minimal complete interface' principle — each component receives exactly the data it needs, no more. If props need to pass through more than 2 layers, I introduce context or use composition (children prop).*

*At SAP, our micro-frontend architecture enforced strict component boundaries — each module was a self-contained component tree. This discipline scaled to dozens of teams working independently."*

### Follow-ups

1. **"How do you decide what goes in a custom hook vs component?"** — If it's behavior without UI (data fetching, event listeners, timers), it's a hook. If it renders something, it's a component.
2. **"What about compound components?"** — For tightly coupled groups (Tabs + Tab, Select + Option), use the compound component pattern with React context for implicit communication.

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Good decomposition: Product Listing
// Container component — owns data
function ProductListContainer({ categoryId }: { categoryId: string }) {
  const { products, isLoading } = useProducts(categoryId);
  const { addToCart } = useCart();

  if (isLoading) return <ProductListSkeleton count={6} />;

  return <ProductGrid products={products} onAddToCart={addToCart} />;
}

// Presentational component — renders from props
function ProductGrid({ products, onAddToCart }: {
  products: Product[];
  onAddToCart: (id: string) => void;
}) {
  return (
    <div className="product-grid" role="list">
      {products.map(p => (
        <ProductCard key={p.id} product={p} onAddToCart={() => onAddToCart(p.id)} />
      ))}
    </div>
  );
}

// Focused component — single responsibility
function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  return (
    <article className="product-card" role="listitem">
      <ProductImage src={product.thumbnail} alt={product.name} />
      <h3>{product.name}</h3>
      <ProductPrice amount={product.price} currency={product.currency} />
      <StarRating value={product.rating} readOnly />
      <button onClick={onAddToCart} disabled={!product.inStock}>
        {product.inStock ? 'Add to Cart' : 'Out of Stock'}
      </button>
    </article>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Component Decomposition = Draw Boxes + Single Responsibility + Container/Presentational/Hook."** Start with the UI mockup, draw boxes around each section. Each box = one component with one job. Three types: Container (data), Presentational (UI), Headless Hook (behavior). Split when > 200 lines or multiple responsibilities. Don't split single-line JSX. Props = minimal complete interface. > 2 layers of prop passing = add context or composition.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** The FIRST thing evaluated in machine coding rounds. Good decomposition = clean code, testable components, and clear communication of your thought process.
**How:** Draw boxes on the UI → identify data flow → categorize (container/presentational/hook) → define minimal props interfaces → build bottom-up.
**Companies:** Microsoft (Fluent UI component model), Adobe (Spectrum design system), Salesforce (LWC component architecture), Cisco (component library patterns).
