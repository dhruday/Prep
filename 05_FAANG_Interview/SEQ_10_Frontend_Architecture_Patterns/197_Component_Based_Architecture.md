# 197. Component-Based Architecture
**Phase:** Performance & Architecture | **Sequence:** 10 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds.

"Component-based architecture is the idea that UIs are built from small, reusable, self-contained pieces — each with its own template, logic, and styles. I've used this every day with Angular and React. The power is in composition: you build a library of trusted components and assemble complex UIs from them like LEGO bricks. At SAP, this model let 3 teams share a single design system across 12+ modules without duplicating code."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists
Component-based architecture organizes UIs into independent, reusable units. Each component:
- Owns its own HTML structure (template)
- Owns its own logic (TypeScript/JS class)
- Owns its own styles (scoped CSS)
- Communicates through clearly defined inputs and outputs (props/events)

It replaced the old jQuery/MVC approach where HTML, logic, and styles were scattered across separate files that were hard to reason about or reuse.

### How It Works Internally

**Component = 3 layers in one unit:**
```
ProductCard Component
├── Template (what it looks like)
│     <div class="card">
│       <img [src]="product.image" />
│       <h3>{{ product.name }}</h3>
│       <button (click)="onBuy()">Buy</button>
│     </div>
│
├── Logic (what it does)
│     @Input() product: Product
│     @Output() buy = new EventEmitter<Product>()
│     onBuy() { this.buy.emit(this.product); }
│
└── Styles (how it looks, scoped to this component)
      .card { border: 1px solid #ccc; }
```

**Component Tree Structure:**
```
AppComponent
├── HeaderComponent
│     └── NavMenuComponent
├── PageLayoutComponent
│     ├── SidebarComponent
│     └── ProductListComponent
│           └── ProductCardComponent (×N)
└── FooterComponent
```

### Architecture & Component Boundaries

**Smart vs Dumb components (Container vs Presentational):**
- **Smart (Container):** Fetches data, manages state, handles business logic
- **Dumb (Presentational):** Receives data via props, emits events upward, has no direct API calls

**Component contract:**
- **Inputs:** what data it needs (props/`@Input`)
- **Outputs:** what events it emits (`@Output`/callbacks)
- **Slots/Content Projection:** what content it accepts inside it (`ng-content`/`children`)

### Data Flow & State Flow
```
Parent passes data DOWN via props/inputs
Child emits events UP via outputs/callbacks

SmartParent (has state)
  → passes product[] to ProductList via @Input
      → ProductList passes each product to ProductCard via @Input
          → ProductCard emits "buy" event via @Output
      ← ProductList forwards event up
  ← SmartParent handles buy action (calls API)
```

This is unidirectional data flow — the foundation of both Angular and React.

### Performance Implications
- **Re-render scope:** Well-designed components only re-render when their inputs change (OnPush in Angular, React.memo in React)
- **Bundle splitting:** Components can be lazy-loaded at route level
- **Style isolation:** Scoped CSS prevents style bleed across components, reducing specificity bugs
- **Reuse reduces bundle size:** One `Button` component used 200 times costs the same as one

### Scalability Considerations
- **Small scale:** Even a handful of components is worth it — starts good habits
- **Medium scale:** Component library shared across teams saves significant duplication
- **Large scale:** Component-based becomes the foundation for design systems, micro-frontends, and module federation

### Trade-offs
| Component-Based | Page-Based (Traditional) | When to Choose Component-Based |
|---|---|---|
| Reusable UI building blocks | One-off templates per page | Always — it's the standard model today |
| Easier to test in isolation | Harder to test full pages | When you care about UI quality |
| Explicit data contracts | Implicit global state | When multiple teams share UI |

### ⚠️ Anti-Patterns & Pitfalls
- **God components:** One component that does everything — handles API, state, routing, and UI. Should be split into smart/dumb pair
- **Prop drilling hell:** Passing data 5 levels deep through props — use Context, state management, or component composition instead
- **Breaking encapsulation:** Child components directly mutating parent data instead of emitting events
- **Overcomponentization:** Making every `<div>` a component — adds overhead with no benefit. Component only when there's a reason to reuse or isolate

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, all 12 modules used a shared SAP Fiori-aligned component library built by one platform team. Product teams consumed `<SmartTable>`, `<SmartForm>`, `<ObjectPageHeader>` components. This meant design consistency across the whole app without each team reinventing UI. My Lighthouse improvement was partly due to switching to pure dumb components with OnPush — reducing change detection cycles by ~70%.

**At FAANG scale:**
- **Microsoft:** Fluent UI (formerly Fabric) is their component library — shared across Teams, Office 365, Azure Portal
- **Adobe:** Spectrum is Adobe's component system — same components in Photoshop Web, XD, Express
- **Salesforce:** Lightning Design System (SLDS) + LWC — Salesforce platform products all use the same component contracts
- **Cisco:** Momentum Design — shared across Webex, Meraki, and enterprise dashboards

**How it evolves with scale:**
- Small scale (1 team): Internal component folder
- Medium scale (3 teams): Shared component library with versioning
- Large scale (10+ teams): Published design system with Storybook, visual regression testing, dedicated platform team

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "I use component-based architecture religiously. The key principle I follow is separating smart components that own data and logic from dumb components that just render what they're given. At SAP, this let the platform team publish a component library that product teams could use without understanding the implementation — they just knew the inputs and outputs. This separation also made testing much simpler: dumb components are just pure functions of their inputs, so unit testing is trivial. The discipline is knowing when NOT to componentize — over-splitting creates noise."

### Likely Follow-up Questions
1. "How do components communicate across the tree?" → Props down, events up / for distant components: shared service, Context, or state management
2. "How do you decide component size?" → Single responsibility — if it does one thing and could be reused elsewhere, extract it
3. "How do you test a component?" → Test the dumb component in isolation with mock inputs; test the smart component by mocking the service calls
4. "What is component composition?" → Building complex UIs by combining simple components, not by inheriting from them — prefer composition over inheritance

### vs Alternatives
| Component-Based | Inheritance-Based | Choose Component-Based |
|---|---|---|
| Compose behavior | Extend classes | Always — composition is more flexible |
| Explicit contracts | Hidden parent state | When building reusable UI |

### How to Signal Senior Thinking
> "The real discipline isn't building components — any junior can do that. The senior skill is defining the right boundaries: what's a component vs what's just a class, when to lift state up, and how to design a component API that's useful to consumers without exposing implementation details."

---

## 💻 5. Code Example

```typescript
// Smart + Dumb component separation — React example
// This is the pattern that makes components testable and reusable

// ✅ DUMB component — pure function of props, no side effects
interface ProductCardProps {
  product: Product;
  onBuy: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, onBuy }) => (
  <div className="product-card">
    <img src={product.imageUrl} alt={product.name} />
    <h3>{product.name}</h3>
    <p>{product.price}</p>
    <button onClick={() => onBuy(product)}>Buy Now</button>
  </div>
));

// ✅ SMART component — owns data fetching and state
const ProductListContainer: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts().then(setProducts);
  }, []);

  const handleBuy = useCallback((product: Product) => {
    addToCart(product); // business logic lives here
  }, []);

  return (
    <div className="product-list">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onBuy={handleBuy} />
      ))}
    </div>
  );
};
```

**Interview vs Production difference:**
In an interview, show the smart/dumb split clearly. In production, add error boundaries, loading states, skeleton placeholders, and accessibility attributes (`role`, `aria-label`) to the dumb components.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** "LEGO bricks — small, reusable pieces that snap together cleanly through defined connectors"
**If you go blank:** "I'd talk about the smart/dumb split — data owners vs data renderers — it's the most important pattern in component architecture."
**Mnemonic:** **SIP** — **S**mart (owns state), **I**nterface (props/outputs), **P**resentational (renders only)

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Consistent UI across the app because the same component is always used
→ Performance: Dumb components with OnPush/memo skip unnecessary renders
→ Business: Shared component libraries accelerate feature development across teams

**How it works (3 sentences):**
Components are self-contained UI units with defined inputs and outputs. Smart components own data and business logic; dumb components only render what they receive. Data flows down via props, events flow up via callbacks — unidirectional data flow.

**Company relevance:**
- Microsoft: Fluent UI is built on this model — expects engineers who can contribute to and consume component systems
- Adobe: Spectrum is Adobe's entire design system — component contract discipline is critical
- Salesforce: LWC is component-based by design — all Salesforce development is component composition
- Cisco: Momentum Design System used across products — component knowledge is core to the frontend role

---
**✅ Topic 197/486 complete → continuing to Topic 198: MVC / MVVM in Frontend**
