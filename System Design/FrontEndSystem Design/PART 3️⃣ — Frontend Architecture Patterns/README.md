# PART 3️⃣ — Frontend Architecture Patterns

## 📖 Overview

This section covers **architectural patterns and principles** for building scalable, maintainable frontend applications. You'll learn structural patterns (MVC, MVVM, etc.), application types (SPA, MPA, etc.), and how to architect systems that serve millions of users.

## 🎯 Why This Matters

At senior+ levels (L5/L6), interviews focus on:
- "How would you architect Netflix's frontend?"
- "Design a component system for 50+ teams."
- "What architecture would you choose for a dashboard with real-time updates?"

This requires knowledge of **architectural patterns**, not just React hooks.

---

## 📚 Module Breakdown

### Module 3.1 — Structural Patterns
**Focus**: Foundational architecture patterns

**Topics Covered**:

#### **MVC (Model-View-Controller)**
```
┌────────────────────────────────────────────────┐
│                   MVC Pattern                   │
├────────────────────────────────────────────────┤
│                                                 │
│    Model                Controller    View     │
│  (Data Logic)        (Business Logic) (UI)     │
│       │                    │            │      │
│       │◄───────────────────┤            │      │
│       │                    │            │      │
│       │                    │───────────►│      │
│       │                                 │      │
│       └─────────────────────────────────┘      │
│          (Model updates View directly)         │
│                                                 │
│  Use Case: Backbone.js, early frameworks       │
│  Pros: Clear separation of concerns            │
│  Cons: Tight coupling, hard to test           │
└────────────────────────────────────────────────┘
```

#### **MVP (Model-View-Presenter)**
```
┌────────────────────────────────────────────────┐
│                  MVP Pattern                    │
├────────────────────────────────────────────────┤
│                                                 │
│    Model              Presenter        View    │
│  (Data Logic)      (Orchestration)   (UI)      │
│       │                  │              │      │
│       │◄─────────────────┤              │      │
│       │                  │◄─────────────┤      │
│       │                  │──────────────►│      │
│       │                  │              │      │
│          (All communication via Presenter)      │
│                                                 │
│  Use Case: Complex forms, enterprise apps      │
│  Pros: Testable, decoupled View                │
│  Cons: More boilerplate code                   │
└────────────────────────────────────────────────┘
```

#### **MVVM (Model-View-ViewModel)**
```
┌────────────────────────────────────────────────┐
│                 MVVM Pattern                    │
├────────────────────────────────────────────────┤
│                                                 │
│    Model           ViewModel          View     │
│  (Data)          (State + Logic)     (UI)      │
│       │                  │              │      │
│       │◄─────────────────┤              │      │
│       │                  │◄─────────────┤      │
│       │                  │ (2-way       │      │
│       │                  │  binding)    │      │
│                                                 │
│  Use Case: React, Vue, Angular                 │
│  Framework: Vue (reactive), React (one-way)    │
│  Pros: Reactive updates, clean separation      │
│  Cons: Learning curve, debugging binding       │
└────────────────────────────────────────────────┘
```

#### **Flux / Redux Pattern**
```
┌────────────────────────────────────────────────┐
│              Flux/Redux Pattern                 │
├────────────────────────────────────────────────┤
│                                                 │
│   Action → Dispatcher → Store → View          │
│              ↑                        │         │
│              └────────────────────────┘         │
│                  (Unidirectional)               │
│                                                 │
│  Use Case: Large state management              │
│  Pros: Predictable state, time-travel debug    │
│  Cons: Boilerplate, over-engineering small apps│
└────────────────────────────────────────────────┘
```

**Interview Questions**:
- "Compare MVC vs MVVM vs Flux."
- "When would you choose Redux over Context API?"
- "How does React's architecture differ from Angular?"

**Interview Relevance**: 🔥🔥🔥🔥
Architectural pattern knowledge separates senior from mid-level engineers.

---

### Module 3.2 — Application Types
**Focus**: SPA, MPA, SSR, SSG trade-offs

**Topics Covered**:

#### **Single Page Application (SPA)**
```
┌────────────────────────────────────────────────┐
│                     SPA                         │
├────────────────────────────────────────────────┤
│  Initial Load:                                  │
│  • Large JS bundle (1-5 MB)                    │
│  • Slow FCP (3-5 seconds)                      │
│  • Bad for SEO (without SSR)                   │
│                                                 │
│  After Load:                                    │
│  • Instant navigation (no page reload)         │
│  • Smooth animations                           │
│  • Rich interactions                           │
│                                                 │
│  Examples: Gmail, Trello, Figma                │
│  Best For: Web apps, dashboards, tools         │
│  Avoid For: Marketing sites, blogs             │
└────────────────────────────────────────────────┘
```

#### **Multi-Page Application (MPA)**
```
┌────────────────────────────────────────────────┐
│                     MPA                         │
├────────────────────────────────────────────────┤
│  Each Navigation:                               │
│  • Full page reload                            │
│  • Server renders HTML                         │
│  • Fast FCP (<1 second)                        │
│  • Great SEO                                   │
│                                                 │
│  Trade-offs:                                    │
│  • Less interactive                            │
│  • Network on every page                       │
│  • State management harder                     │
│                                                 │
│  Examples: Amazon, eBay, Wikipedia             │
│  Best For: E-commerce, content sites           │
└────────────────────────────────────────────────┘
```

#### **Server-Side Rendering (SSR)**
```
┌────────────────────────────────────────────────┐
│              SSR (Next.js, Remix)               │
├────────────────────────────────────────────────┤
│  Flow:                                          │
│  1. Server renders HTML (with data)            │
│  2. Send HTML to client (fast FCP)             │
│  3. Hydrate with JS (interactive)              │
│  4. SPA behavior after hydration               │
│                                                 │
│  Pros:                                          │
│  • Best of both worlds                         │
│  • SEO-friendly                                │
│  • Fast perceived load                         │
│                                                 │
│  Cons:                                          │
│  • Server costs                                │
│  • Complexity (hydration issues)               │
│  • TTFB vs FCP trade-off                       │
│                                                 │
│  Use Case: E-commerce, news, social media      │
└────────────────────────────────────────────────┘
```

#### **Static Site Generation (SSG)**
```
┌────────────────────────────────────────────────┐
│           SSG (Next.js, Gatsby, Astro)          │
├────────────────────────────────────────────────┤
│  Build Time:                                    │
│  • Generate all HTML pages                     │
│  • Can fetch data from CMS/API                 │
│  • Output static files                         │
│                                                 │
│  Runtime:                                       │
│  • Serve from CDN (ultra-fast)                 │
│  • No server needed                            │
│  • Optional client-side hydration              │
│                                                 │
│  Pros:                                          │
│  • Fastest possible (CDN)                      │
│  • Cheap hosting                               │
│  • Perfect Lighthouse scores                   │
│                                                 │
│  Cons:                                          │
│  • Rebuild for content changes                 │
│  • Not for dynamic/personalized content        │
│                                                 │
│  Use Case: Marketing sites, blogs, docs        │
└────────────────────────────────────────────────┘
```

#### **Incremental Static Regeneration (ISR)**
```
Best of SSG + SSR:
• Generate pages at build time
• Regenerate in background when stale
• Serve stale while revalidating
• Scale to millions of pages

Use Case: E-commerce with 100K+ products
```

**Decision Matrix**:
```
┌──────────────┬──────┬──────┬──────┬──────┬──────┐
│              │ SPA  │ MPA  │ SSR  │ SSG  │ ISR  │
├──────────────┼──────┼──────┼──────┼──────┼──────┤
│ FCP          │ Slow │ Fast │ Fast │ Fast │ Fast │
│ SEO          │ Bad  │ Good │ Good │ Good │ Good │
│ Interactivity│ Best │ Low  │ Good │ Good │ Good │
│ Server Cost  │ None │ Med  │ High │ None │ Low  │
│ Complexity   │ Low  │ Low  │ High │ Med  │ High │
│ Real-time    │ Easy │ Hard │ Med  │ Hard │ Med  │
└──────────────┴──────┴──────┴──────┴──────┴──────┘
```

**Interview Questions**:
- "Design Twitter's frontend architecture."
- "SPA vs SSR - when would you choose each?"
- "How does Next.js implement ISR?"

**Interview Relevance**: 🔥🔥🔥🔥🔥
This is THE most common frontend architecture question.

---

### Module 3.3 — Scale-Oriented Architectures
**Focus**: Micro-frontends, monorepos, module federation

**Topics Covered**:

#### **Micro-Frontends**
```
┌────────────────────────────────────────────────┐
│              MICRO-FRONTENDS                    │
├────────────────────────────────────────────────┤
│                                                 │
│  Shell App (Host)                              │
│  ┌──────────────────────────────────────────┐ │
│  │ Header (Shared)                          │ │
│  ├──────────────────────────────────────────┤ │
│  │                                          │ │
│  │  ┌──────────┐  ┌──────────┐            │ │
│  │  │ Product  │  │ Checkout │ (Remote)   │ │
│  │  │  Team A  │  │  Team B  │            │ │
│  │  └──────────┘  └──────────┘            │ │
│  │                                          │ │
│  ├──────────────────────────────────────────┤ │
│  │ Footer (Shared)                          │ │
│  └──────────────────────────────────────────┘ │
│                                                 │
│  Benefits:                                      │
│  • Team autonomy (deploy independently)        │
│  • Tech diversity (React + Vue + Angular)      │
│  • Fault isolation (one app crash ≠ all crash)│
│                                                 │
│  Challenges:                                    │
│  • Shared dependencies (duplication)           │
│  • Performance overhead (multiple bundles)     │
│  • Complex orchestration                       │
│                                                 │
│  Implementations:                               │
│  • Module Federation (Webpack 5)               │
│  • Single-SPA framework                        │
│  • Server-side composition (SSR)               │
│  • iFrames (legacy, avoid)                     │
└────────────────────────────────────────────────┘
```

**Example: Module Federation**
```javascript
// Host App (webpack.config.js)
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        productApp: 'productApp@http://localhost:3001/remoteEntry.js',
        checkoutApp: 'checkoutApp@http://localhost:3002/remoteEntry.js'
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true }
      }
    })
  ]
};

// Remote App (webpack.config.js)
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'productApp',
      filename: 'remoteEntry.js',
      exposes: {
        './ProductList': './src/components/ProductList'
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true }
      }
    })
  ]
};

// Usage in Host
const ProductList = React.lazy(() => import('productApp/ProductList'));

function App() {
  return (
    <Suspense fallback="Loading...">
      <ProductList />
    </Suspense>
  );
}
```

#### **Monorepo vs Polyrepo**
```
┌────────────────────────────────────────────────┐
│              MONOREPO (Nx, Turborepo)           │
├────────────────────────────────────────────────┤
│  Single Repository:                             │
│  /apps                                          │
│    /web         (Next.js app)                  │
│    /mobile      (React Native)                 │
│    /admin       (Vue app)                      │
│  /packages                                      │
│    /ui          (Shared components)            │
│    /utils       (Shared utilities)             │
│    /types       (Shared TypeScript types)      │
│                                                 │
│  Pros:                                          │
│  • Code sharing (DRY)                          │
│  • Atomic commits (cross-app changes)          │
│  • Unified CI/CD                               │
│  • Better refactoring                          │
│                                                 │
│  Cons:                                          │
│  • Build complexity                            │
│  • Git operations slower                       │
│  • Access control harder                       │
│                                                 │
│  Tools: Nx, Turborepo, Lerna, Rush             │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│                   POLYREPO                      │
├────────────────────────────────────────────────┤
│  Multiple Repositories:                         │
│  repo/web-app                                  │
│  repo/mobile-app                               │
│  repo/ui-library                               │
│  repo/shared-utils                             │
│                                                 │
│  Pros:                                          │
│  • Team autonomy                               │
│  • Clear ownership                             │
│  • Simpler CI/CD per repo                      │
│  • Access control easier                       │
│                                                 │
│  Cons:                                          │
│  • Code duplication                            │
│  • Version management hell                     │
│  • Cross-repo changes hard                     │
│                                                 │
│  When to Use: Separate teams, different tech   │
└────────────────────────────────────────────────┘
```

#### **Component Architecture at Scale**
```
Design System Hierarchy:

1. Design Tokens (Primitives)
   • Colors, spacing, typography
   • Platform-agnostic
   • Shared across web/mobile

2. Core Components (Atoms)
   • Button, Input, Icon
   • Highly reusable
   • Zero business logic

3. Composite Components (Molecules)
   • SearchBar, Card, FormField
   • Combine atoms
   • Generic logic

4. Feature Components (Organisms)
   • ProductCard, UserProfile
   • Business logic
   • App-specific

5. Pages/Routes (Templates)
   • Full layouts
   • Route definitions
   • Data fetching
```

**Interview Questions**:
- "Design a component system for 50 teams at Facebook."
- "Micro-frontends vs monolith - trade-offs?"
- "How would you share code across React and React Native?"
- "Explain Module Federation."

**Interview Relevance**: 🔥🔥🔥🔥🔥
This is asked for senior+ roles managing multiple teams.

---

## 🎓 Study Plan

### Week 1: Structural Patterns
- **Day 1-2**: MVC, MVP, MVVM comparison
- **Day 3-4**: Flux/Redux architecture
- **Day 5**: React's reconciliation and Fiber
- **Day 6-7**: Build sample apps with different patterns

### Week 2: Application Types
- **Day 1-2**: SPA deep-dive (routing, state)
- **Day 3-4**: SSR implementation (Next.js)
- **Day 5-6**: SSG and ISR
- **Day 7**: Build hybrid app (SSG + client-side)

### Week 3: Scale-Oriented
- **Day 1-3**: Micro-frontends (Module Federation)
- **Day 4-5**: Monorepo setup (Nx/Turborepo)
- **Day 6-7**: Design system architecture

### Week 4: Integration
- **Day 1-3**: Build mini micro-frontend app
- **Day 4-5**: Practice architecture interviews
- **Day 6-7**: Review and refine

---

## 📊 Assessment Checklist

### Module 3.1: Structural Patterns
- [ ] Can explain MVC, MVP, MVVM with diagrams
- [ ] Can compare React vs Angular architecture
- [ ] Can implement Flux pattern from scratch
- [ ] Can explain unidirectional data flow benefits
- [ ] Can choose pattern based on use case

### Module 3.2: Application Types
- [ ] Can articulate SPA vs MPA trade-offs
- [ ] Can explain SSR hydration process
- [ ] Can design SSG + ISR strategy
- [ ] Can choose rendering strategy per use case
- [ ] Can optimize for Core Web Vitals per type

### Module 3.3: Scale-Oriented
- [ ] Can design micro-frontend architecture
- [ ] Can explain Module Federation
- [ ] Can compare monorepo vs polyrepo
- [ ] Can architect design system
- [ ] Can discuss team scaling challenges

---

## 🎯 Common Interview Questions (Part 3)

### Architecture Pattern Questions
1. "Explain React's architecture. Why unidirectional data flow?"
2. "What are the trade-offs of Redux vs MobX?"
3. "How would you migrate from MVC to MVVM?"

### Application Type Questions
1. "Design an e-commerce site. SPA or MPA? Why?"
2. "What's the difference between SSR and SSG?"
3. "Explain Next.js ISR. When would you use it?"

### Scale Questions
1. "You have 20 teams building one app. How do you architect it?"
2. "Micro-frontends vs modular monolith?"
3. "How do you share components across teams?"

### Real-World Scenarios
1. "Design Netflix's frontend architecture."
2. "Design Amazon product page (considering SEO + performance)."
3. "Design a dashboard with real-time updates (Datadog-like)."

---

## 💡 Key Takeaways

### Architecture Decision Framework

```
┌─────────────────────────────────────────────────────────────┐
│            FRONTEND ARCHITECTURE DECISIONS                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. TEAM SIZE                                               │
│     • 1-5 devs: Monolith (simple)                          │
│     • 5-20 devs: Modular monolith                          │
│     • 20+ devs: Micro-frontends                            │
│                                                              │
│  2. USER TYPE                                               │
│     • Internal tool: SPA (rich interactions)               │
│     • Marketing site: SSG (speed + SEO)                    │
│     • E-commerce: SSR/ISR (dynamic + SEO)                  │
│     • Dashboard: SPA with SSR shell                        │
│                                                              │
│  3. TRAFFIC PATTERN                                         │
│     • High traffic: SSG/CDN (cheapest)                     │
│     • Personalized: SSR (dynamic)                          │
│     • Real-time: SPA with WebSocket                        │
│                                                              │
│  4. SEO IMPORTANCE                                          │
│     • Critical: SSR or SSG                                 │
│     • Not important: SPA                                   │
│                                                              │
│  5. TEAM EXPERTISE                                          │
│     • Junior team: Simple SPA                              │
│     • Senior team: Complex SSR/ISR                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Common Anti-Patterns to Avoid

❌ **Premature Micro-Frontends**
- Don't split until team > 20 people
- Complexity >> benefits for small teams

❌ **Over-Engineering**
- Don't use Redux for simple state
- Don't use SSR if SEO not needed

❌ **No Clear Architecture**
- "It just evolved" is not a strategy
- Document architectural decisions

❌ **Ignoring Trade-offs**
- Every pattern has costs
- Be explicit about what you're optimizing for

---

## 📚 Recommended Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs) - SSR/SSG/ISR
- [Module Federation](https://webpack.js.org/concepts/module-federation/)
- [Nx Monorepo](https://nx.dev/)

### Articles
- [Micro-Frontends (Martin Fowler)](https://martinfowler.com/articles/micro-frontends.html)
- [Patterns.dev](https://patterns.dev/) - All patterns
- [The Cost of JavaScript](https://v8.dev/blog/cost-of-javascript-2019)

### Books
- **"Micro Frontends in Action"** by Michael Geers
- **"Building Micro-Frontends"** by Luca Mezzalira

### Real-World Case Studies
- **Spotify**: Micro-frontends with iframes → Module Federation
- **Zalando**: Micro-frontends with SSR composition
- **Microsoft**: Monorepo with Rush
- **Netflix**: SSR with client-side hydration

---

## 🎬 Next Steps

After completing Part 3, you should:

1. ✅ Understand all major architectural patterns
2. ✅ Know when to use SPA vs SSR vs SSG
3. ✅ Can design systems for 1-1000 engineers
4. ✅ Articulate trade-offs clearly

**Proceed to**: [PART 4 — Rendering Strategies](../PART%204️⃣%20—%20Rendering%20Strategies/README.md)

This will deep-dive into rendering optimization techniques.

---

**Part 3 Status**: Architecture Mastery ✅
**Estimated Study Time**: 3-4 weeks
**Next Part**: Rendering Strategies (CSR, SSR, SSG, ISR deep-dive)

You're now ready to design architectures for FAANG-scale applications! 🏗️
