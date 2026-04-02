# 207. Feature-Based vs Layer-Based Structuring
**Phase:** Performance & Architecture | **Sequence:** 10 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds.

"Feature-based structure groups all files related to a feature together — components, services, tests, and state all in one folder. Layer-based structure groups by technical role — all components together, all services together, all state together. I've used both. At Bosch with a smaller team, layer-based worked fine. At SAP with 3 teams and 12 modules, feature-based was essential — when a team owned the 'Performance' module, everything they needed was in one folder. Layer-based breaks down when teams own features, not technical layers."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**Layer-Based (Technical / Type-Based) Structure:**
Files organized by what they ARE technologically:
```
src/
├── components/     ← all components
│   ├── Button.tsx
│   ├── ProductCard.tsx
│   └── UserProfile.tsx
├── services/       ← all services  
│   ├── product.service.ts
│   └── user.service.ts
├── store/          ← all state
│   ├── product.slice.ts
│   └── user.slice.ts
└── pages/          ← all pages
    ├── ProductPage.tsx
    └── UserPage.tsx
```

**Feature-Based Structure:**
Files organized by what they DO for the user:
```
src/
├── features/
│   ├── products/           ← everything for Products feature
│   │   ├── components/
│   │   │   ├── ProductCard.tsx
│   │   │   └── ProductList.tsx
│   │   ├── services/
│   │   │   └── product.service.ts
│   │   ├── store/
│   │   │   └── product.slice.ts
│   │   ├── pages/
│   │   │   └── ProductPage.tsx
│   │   └── index.ts        ← public API for this feature
│   │
│   └── user/               ← everything for User feature
│       ├── components/
│       ├── services/
│       ├── store/
│       └── index.ts
│
└── shared/                 ← things used across features
    ├── components/
    └── utils/
```

### How It Works Internally

**The key difference is import patterns:**

**Layer-based imports (long cross-cutting paths):**
```typescript
// In ProductPage component
import { ProductCard } from '../../components/ProductCard';
import { ProductService } from '../../services/product.service';
import { selectProducts } from '../../store/product.slice';
// Three different folders → navigating the folder tree constantly
```

**Feature-based imports (clean, local paths):**
```typescript
// In ProductPage component — all in the same feature folder
import { ProductCard } from './components/ProductCard';
import { ProductService } from './services/product.service';
import { selectProducts } from './store/product.slice';
// Everything nearby → move one feature → no broken imports
```

### Architecture & Component Boundaries

**Rule of thumb for feature-based structuring:**
- **Feature folders:** Group all code owned by one team or one user-facing capability
- **Shared folder:** Only code that is genuinely needed by 2+ features
- **No cross-feature imports:** Feature A should not import directly from Feature B — communicate through the feature's public `index.ts` or through shared state
- **Public API via index.ts:** Each feature folder has an `index.ts` that explicitly declares what it exports. Internal implementation is hidden.

```
features/products/index.ts:
  export { ProductPage } from './pages/ProductPage';
  // Internal components are NOT exported — they're implementation details
```

### Data Flow & State Flow

**Feature-based data ownership:**
```
Feature: Products
  → Owns: ProductState in Redux
  → Owns: ProductService (API calls)
  → Exposes: selectProducts, selectProductById (selectors)
  → Consumes: UserState.userId (from User feature via selector)
  
Feature: Cart
  → Consumes: ProductState.productById (via selector)
  → Owns: CartState
  → Does NOT import directly from features/products/
```

Cross-feature communication always goes through:
1. Shared state (Redux selectors)
2. Custom events
3. URL params
Never through direct folder imports between features.

### Performance Implications
- **Code splitting:** Feature-based structure naturally maps to route-level code splitting — each feature is a separate lazy-loaded chunk
- **Dead code elimination:** Clear feature boundaries make it obvious when an entire feature can be removed — just delete the folder
- **No impact on runtime performance** — this is purely a DX and maintainability concern

### Scalability Considerations
- **1 team, 5 features:** Either works. Layer-based is simpler initially.
- **3 teams, each owning features:** Feature-based is critical. Teams work in isolation in their own feature folder.
- **10 teams:** Feature-based with a team ownership declaration (CODEOWNERS file) per feature folder. Platform enforces no cross-feature imports.

### Trade-offs
| Feature-Based | Layer-Based | When to Choose Feature-Based |
|---|---|---|
| Easy to find all related code | Easy to find all components | 2+ teams, each owning features |
| Natural code splitting boundary | Cross-cutting changes are easy | Features are large and independent |
| Hard to share across features | Easy to share across layers | Feature isolation is more important than easy sharing |
| Familiar to micro-service devs | Familiar to traditional MVC devs | Large team or growing team |

### ⚠️ Anti-Patterns & Pitfalls
- **Shared folder growing too large:** If `shared/` has 80% of the code, the structure provides no benefit — audit what's truly shared vs what belongs to a specific feature
- **Feature folders with one file:** A feature folder with one component and one service is overhead — use layer-based for small apps
- **Cross-feature direct imports:** `import { something } from '../products/services/product.service'` — this defeats the purpose. Use the public `index.ts` or shared state.
- **Deep nesting:** `features/products/sub-feature/components/partials/row/` — max 2 levels in a feature folder. Beyond that, create a sub-feature.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP with 3 teams, each team owned a feature folder (`/performance`, `/analytics`, `/admin`). When I needed to change how the performance module handled data export, I opened `/features/performance/` and had everything: the component, the service, the state slice, and the tests — all in one place. Compare this to Bosch's layer-based structure where changing one feature meant touching `/components`, `/services`, `/store`, and `/pages` all in separate folders across the project.

**At FAANG scale:**
- **Microsoft:** NX monorepo with feature libs per team — each `libs/teams/feature-name` is an independent feature. Cross-team imports forbidden by ESLint rules.
- **Adobe:** Feature-folder structure in Photoshop Web — Crop Tool, Selection Tool, Export Tool each have their own folders with independent state.
- **Salesforce:** Each Salesforce Cloud (Sales, Service) maps to a feature folder — independent state, services, and components.

**How it evolves with scale:**
- 1 team: Layer-based is fine and simpler
- 3 teams: Migrate to feature-based as soon as teams form around features
- 10+ teams: Feature folder = NX project library — strict boundary enforcement with `@nx/enforce-module-boundaries` ESLint rule

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "I moved from layer-based to feature-based structure when I joined SAP and saw the difference immediately. With layer-based, changing one product feature touched 4 different folders scattered across the project. With feature-based, a new team member could own the `/performance` module completely — they found everything they needed in one folder. The principle I follow: the folder structure should reflect team ownership and user-facing capabilities. Layers reflect technology, which is the wrong axis for team organization. The trade-off is that sharing code across features requires more discipline — I use a strict `shared/` folder and enforce no cross-feature direct imports via ESLint rules."

### Likely Follow-up Questions
1. "How do you handle code shared between features?" → `shared/` folder — but ruthlessly audit it. Only genuinely reused code belongs there.
2. "What is a barrel file (index.ts)?" → The public API of a feature — explicitly lists what the feature exposes to others. Internal files are not exported.
3. "How do you enforce no cross-feature imports?" → ESLint rules (NX enforce-module-boundaries) — static analysis that fails CI if a feature imports another feature's internal files

### vs Alternatives
| Feature-Based | Layer-Based | Domain-Driven (DDD) |
|---|---|---|
| Organized by user capability | Organized by technology | Organized by business domain |
| Best for team ownership | Best for tech-first teams | Best for enterprise complex domains |
| Common in React/Angular apps | Common in MVC apps | Common in large enterprise systems |

### How to Signal Senior Thinking
> "The folder structure is Conway's Law applied to files. If your teams own features, your files should be arranged by features. If your teams own technical areas (all JS engineers, all CSS engineers), then layer-based makes sense. Always organize code to minimize coordination overhead between teams."

---

## 💻 5. Code Example

```
// Feature-based project structure — Angular or React
// With public API (barrel file) and shared folder discipline

src/
├── features/
│   │
│   ├── products/                     ← Team A owns this folder
│   │   ├── components/
│   │   │   ├── ProductCard/
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── ProductCard.test.tsx
│   │   │   │   └── ProductCard.module.css
│   │   │   └── ProductList/
│   │   ├── services/
│   │   │   └── product.api.ts
│   │   ├── store/
│   │   │   ├── product.slice.ts
│   │   │   └── product.selectors.ts
│   │   ├── hooks/
│   │   │   └── useProducts.ts
│   │   ├── pages/
│   │   │   └── ProductsPage.tsx
│   │   └── index.ts                  ← Public API
│   │       ← export { ProductsPage } from './pages/ProductsPage'
│   │       ← // Nothing else is exported — internals are private
│   │
│   └── cart/                         ← Team B owns this folder
│       ├── store/
│       ├── services/
│       ├── pages/
│       └── index.ts
│
├── shared/                           ← Genuinely cross-feature code only
│   ├── components/
│   │   ├── Button/
│   │   └── Modal/
│   ├── hooks/
│   │   └── useDebounce.ts
│   └── utils/
│       └── formatters.ts
│
└── app/
    ├── router.tsx                    ← imports from feature index.ts
    └── store.ts                      ← combines feature slices
```

```typescript
// Enforcing feature boundaries with ESLint (NX / custom rule)
// .eslintrc.json
{
  "rules": {
    "@nx/enforce-module-boundaries": ["error", {
      "allow": [],
      "depConstraints": [
        {
          "sourceTag": "scope:products",
          "onlyDependOnLibsWithTags": ["scope:shared", "scope:core"]
          // products CANNOT import from scope:cart
        },
        {
          "sourceTag": "scope:cart",
          "onlyDependOnLibsWithTags": ["scope:shared", "scope:core"]
        }
      ]
    }]
  }
}
```

**Interview vs Production difference:**
In an interview, the folder diagram + the principle (organize by ownership) is the key answer. In production, enforce it with ESLint rules and CODEOWNERS file so GitHub requires team review for changes in their feature folder.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** "Feature-based = one drawer per outfit (jacket + pants + shirt together). Layer-based = all jackets in one drawer, all pants in another. Feature-based is faster when you want to find an outfit (feature), not when you want all jackets."
**If you go blank:** "Feature-based groups by what the user sees. Layer-based groups by what the code is. For multi-team apps, feature-based is always better."
**Mnemonic:** **FLOSS** — **F**eature owns all its code, **L**ayer splits by tech type, **O**wnership drives structure, **S**hared is minimal, **S**trong boundaries prevent coupling

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: No direct UX impact — this is developer experience and code organization
→ Performance: Feature folders map naturally to lazy-loaded route chunks
→ Business: Faster development — teams find all feature code in one place, reducing context switching

**How it works (3 sentences):**
Feature-based structuring places all code related to one user-facing capability (components, services, state, tests) in one folder. Each feature exposes a public API via `index.ts` and hides its internals. Cross-feature imports are forbidden — features communicate through shared state, events, or the shared folder.

**Company relevance:**
- Microsoft: NX monorepos with feature libs — any senior role requires understanding of feature-based structuring and boundary enforcement
- Adobe: Creative Cloud web features (Crop, Export, Selection) are feature-folder organized — independent deployability requires this
- Salesforce: Each Salesforce Cloud is a feature in the overall platform monorepo
- Cisco: Webex feature teams each own feature folders — expected to know why boundaries matter

---
**✅ Topic 207/486 complete → continuing to Topic 208: Monorepo Architecture (Nx, Turborepo)**
