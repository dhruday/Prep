---

## Week 6 (Days 36–42): Advanced System Design & Architecture

### DAY 36 — Micro-Frontends Architecture

**Why it matters:** Micro-frontends appear at large organizations (Spotify, IKEA, Zalando) and are increasingly discussed at Google and Meta senior interviews. It's a polarizing topic — knowing the trade-offs deeply impresses interviewers.

**Study Agenda (75 min)**

- What micro-frontends solve (team autonomy, independent deployment, tech diversity)
- Implementation approaches:
  - Build-time composition (npm packages)
  - Server-side composition (Edge Side Includes, SSI)
  - Runtime composition: iframes, module federation (Webpack 5), Web Components
- Module Federation deep dive: host, remotes, shared dependencies
- Cross-application communication: custom events, shared stores, URL
- Shared design system across micro-frontends
- Performance: bundle duplication, waterfall loading
- Testing challenges: integration testing, contract testing
- When NOT to use micro-frontends (the overhead is real)

**Hands-on (10 min)**
Design a micro-frontend architecture for an enterprise SaaS with: auth portal, dashboard, analytics module, and settings — each owned by different teams.

---

**📝 Day 36 Interview Practice Questions**

1. **(Hard | Google, Meta)** What are micro-frontends? What problem do they solve and when are they the wrong solution?

2. **(Hard | Adobe, Salesforce)** Compare the three implementation approaches for micro-frontends: iframes, Module Federation, and Web Components. What are the trade-offs?

3. **(Medium | All Companies)** What is Webpack Module Federation? How does it allow multiple applications to share code at runtime?

4. **(Hard | Meta, Adobe)** How do you share a design system across micro-frontends without duplication? How do you handle versioning mismatches?

5. **(Medium | Google, Salesforce)** How do micro-frontends communicate? What are the options and what are the risks of each?

6. **(Hard | Adobe, Microsoft)** What are the performance implications of micro-frontends? How do you prevent duplicate vendor bundles?

7. **(Medium | All Companies)** What is a "strangler fig" migration pattern for moving from a monolith frontend to micro-frontends?

8. **(Hard | Salesforce)** Design the authentication strategy for a micro-frontend application where each app is served from a different subdomain.

9. **(Medium | Google, Adobe)** What are the testing challenges unique to micro-frontend architectures? How do you write integration tests across boundaries?

10. **(Hard | Meta, Airbnb)** A company wants to migrate their React monolith to micro-frontends. Walk through the risks, timeline, and migration strategy.

---

### DAY 37 — Progressive Web Apps (PWA) & Service Workers Deep Dive

**Why it matters:** PWA is tested at Google, Adobe, and companies targeting emerging markets. Service Workers are also used for performance (background sync, smart caching) even outside offline contexts.

**Study Agenda (75 min)**

- PWA pillars: Installable, Reliable (offline), Capable (native-like)
- Service Worker lifecycle: install, activate, fetch, push, sync
- Cache strategies (deep dive): implementing each in code
- Background Sync API: queuing offline actions
- Push Notifications: VAPID keys, subscription, displaying notifications
- Web App Manifest: icons, display mode, theme color, shortcuts
- IndexedDB for offline data storage
- Workbox: strategies and how it simplifies Service Workers
- PWA performance: App Shell model
- Testing Service Workers (tricky unit testing)

**Hands-on (15 min)**
Write a Service Worker from scratch that implements:
1. Cache First for static assets
2. Network First for API calls
3. Stale-while-revalidate for images

---

**📝 Day 37 Interview Practice Questions**

1. **(Hard | Google, Adobe)** "Design a Progressive Web App for a news reader that works offline." Complete architecture including service worker strategy.

2. **(Medium | All Companies)** Explain the Service Worker lifecycle. When does `install` fire vs `activate`? Why is there a delay between the two?

3. **(Hard | Google)** How do you implement background sync for offline form submissions? Walk through the Service Worker API code.

4. **(Medium | Adobe, Microsoft)** What is the Web App Manifest? What properties are required for a site to show an "Add to Home Screen" prompt?

5. **(Hard | Google, Netflix)** Design the caching architecture for a news app: articles are updated frequently, images change rarely, and user preferences should persist offline.

6. **(Medium | All Companies)** What is the App Shell model? How does it improve perceived performance for PWAs?

7. **(Hard | Google)** How do push notifications work on the web? What are VAPID keys and how does the push subscription flow work?

8. **(Medium | Adobe, Cisco)** What is Workbox? What does it add over raw Service Worker APIs? What are its limitations?

9. **(Hard | Google, Meta)** How do you test a Service Worker? What makes it difficult and how do you work around the challenges?

10. **(Medium | All Companies)** What is IndexedDB? When would you use it over localStorage? Implement a simple wrapper around it.

---

### DAY 38 — Accessibility (a11y) Engineering Deep Dive

**Why it matters:** Accessibility is asked at every company but rarely prepared deeply. Engineers who can speak fluently about WCAG, ARIA, focus management, and accessible component patterns immediately stand out.

**Study Agenda (75 min)**

- WCAG 2.1 principles: Perceivable, Operable, Understandable, Robust
- WCAG levels: A, AA, AAA — what companies typically require
- Semantic HTML: why it matters more than ARIA
- ARIA: roles, states, properties — the ARIA authoring practices guide
- Focus management: focus traps, skip links, focus indicators
- Screen reader behavior: how NVDA/JAWS/VoiceOver work
- Common accessible patterns: modal, combobox, tabs, accordion, data grid
- Accessible forms: label associations, error messages, grouping
- Color contrast requirements (4.5:1 for normal text, 3:1 for large)
- Motion: `prefers-reduced-motion`, `prefers-color-scheme`
- Testing tools: axe, Lighthouse, manual keyboard testing
- Keyboard navigation requirements for all interactive elements

**Hands-on (15 min)**
Audit this component and list every accessibility issue:
```html
<div onclick="openModal()">Click here for details</div>
<div class="modal">
  <div class="close" onclick="closeModal()">X</div>
  <input placeholder="Search">
</div>
```

---

**📝 Day 38 Interview Practice Questions**

1. **(Hard | Google, Adobe)** What are the four WCAG principles? Give one concrete example of a violation and its fix for each.

2. **(Medium | All Companies)** What is the difference between semantic HTML and ARIA? When should you use ARIA and when is it harmful?

3. **(Hard | Meta, Airbnb)** Implement an accessible modal dialog: focus trap, escape to close, return focus on close, aria-labelledby, aria-describedby.

4. **(Medium | Adobe, Microsoft)** What is a "focus trap"? When is it required and how do you implement it?

5. **(Hard | Google)** Implement an accessible tab panel using the ARIA Authoring Practices Guide pattern. Include keyboard navigation (left/right arrows).

6. **(Medium | All Companies)** What color contrast ratio is required for normal text (WCAG AA)? How do you check if a color combination meets the requirement?

7. **(Hard | Adobe, Salesforce)** Design an accessible data grid (table) that supports: keyboard navigation, row selection, sortable columns, and works with screen readers.

8. **(Medium | Google, Meta)** What is `prefers-reduced-motion`? Implement a component that respects this media query for an animated hero banner.

9. **(Hard | Airbnb)** Conduct an accessibility audit of a form with these fields: email, phone, credit card. What issues would you find and how would you fix each?

10. **(Medium | All Companies)** What is an `aria-live` region? What are the values and when do you use each?

11. **(Hard | Adobe, Microsoft)** How do you make a custom dropdown/select component accessible? What ARIA role does it get and what keyboard interactions are required?

---

### DAY 39 — Testing Strategy for Senior Engineers

**Why it matters:** At senior level, you're expected to define testing strategy, not just write tests. Companies like Stripe, Google, and Meta specifically ask about testing architecture.

**Study Agenda (75 min)**

- Testing pyramid: unit → integration → E2E — correct proportions
- Unit testing: React Testing Library philosophy, not testing implementation details
- Integration testing: testing components with their context
- E2E testing: Playwright/Cypress, when and what to test
- Visual regression testing: Chromatic, Percy
- Contract testing: Pact for API contracts
- Performance testing: Lighthouse CI, Web Vitals in CI
- Accessibility testing: axe-core integration in CI
- Test coverage: what it measures and what it doesn't
- Mocking strategy: what to mock and what not to
- Testing async code: `waitFor`, `findBy*`, `act()`
- TDD vs test-after — when each is appropriate

**Hands-on (15 min)**
Write a complete test suite for an Autocomplete component:
- Renders suggestions on typing
- Keyboard navigation works
- Selects item on Enter
- Handles error state
- Debounces API calls (mock timer)

---

**📝 Day 39 Interview Practice Questions**

1. **(Hard | Stripe, Google)** What is the "testing pyramid"? Why is an "ice cream cone" anti-pattern harmful?

2. **(Medium | All Companies)** What is the core philosophy of React Testing Library? How is it different from Enzyme?

3. **(Hard | Meta, Stripe)** What should and shouldn't you mock in a frontend test? What are the signals that you're over-mocking?

4. **(Medium | Google, Adobe)** What is visual regression testing? When does it add value vs add maintenance burden?

5. **(Hard | Stripe)** Design the complete testing strategy for a payment form: what tests at each level, what you mock, and what you never mock.

6. **(Medium | All Companies)** How do you test custom React hooks? What tool do you use and what does it test that component tests don't?

7. **(Hard | Google, Netflix)** Implement a test for a component that fetches data on mount, shows a loading state, and renders results. Include error state testing.

8. **(Medium | Meta, Microsoft)** What is `act()` in React Testing Library? When do you need to wrap code in it?

9. **(Hard | Stripe, Adobe)** What is contract testing? How does Pact prevent frontend breaking changes from backend API changes?

10. **(Medium | All Companies)** What are the risks of using `getByTestId` in tests? When is it acceptable?

11. **(Hard | Google)** Design a CI pipeline that enforces: unit test coverage, E2E tests, visual regression, Lighthouse scores, and accessibility checks.

---

### DAY 40 — Build Tools, Bundlers, and Module Systems

**Why it matters:** Senior engineers at Google, Meta, and Microsoft are expected to understand and optimize build pipelines. This knowledge directly impacts performance (bundle size) and developer experience.

**Study Agenda (75 min)**

- ES Modules vs CommonJS vs AMD — syntax and semantics
- Module resolution: Node.js algorithm, browser vs bundler
- Webpack deep dive: entry, loaders, plugins, code splitting, chunk strategies
- Vite: ESBuild for dev, Rollup for production, why it's faster
- Rollup: tree shaking, library bundling
- ESBuild: Go-based, why it's 100x faster
- Turbopack: Rust-based, incremental bundling
- Tree shaking: what makes code tree-shakeable, side effects declaration
- Code splitting: entry, async, vendor chunks
- Module Federation (revisit from bundler perspective)
- Polyfills and transpilation: Babel, SWC, browserslist
- Source maps: how they work, security implications

**Hands-on (10 min)**
Analyze why this module is NOT tree-shakeable and fix it:
```javascript
// utils.js
export default {
  add: (a, b) => a + b,
  multiply: (a, b) => a * b,
  complexFunction: () => { /* large code */ }
}
```

---

**📝 Day 40 Interview Practice Questions**

1. **(Hard | Google, Meta)** Compare Webpack, Vite, and Turbopack. What architectural differences explain their speed differences?

2. **(Medium | All Companies)** What is tree shaking? What makes a module tree-shakeable? What breaks tree shaking?

3. **(Hard | Meta, Netflix)** Walk me through your strategy for reducing a 4MB Webpack bundle to under 300KB for initial load.

4. **(Medium | Google, Microsoft)** What is the difference between CommonJS and ES Modules in terms of static vs dynamic analysis?

5. **(Hard | Stripe, Adobe)** How do you configure Webpack code splitting for a large app? Explain entry chunks, async chunks, and the `SplitChunksPlugin`.

6. **(Medium | All Companies)** What are source maps? Why might you not want to deploy them publicly in production?

7. **(Hard | Meta, Netflix)** What is the `sideEffects` field in `package.json`? How does it affect tree shaking? What happens if you set it incorrectly?

8. **(Medium | Google, Stripe)** How does Vite work differently in development vs production? Why is it so fast in development?

9. **(Hard | Adobe, Microsoft)** What is Babel and what does it do? How does SWC compare? When would you use each?

10. **(Medium | Netflix, Uber)** How do you analyze your bundle composition and identify what's making it large? What tools do you use?

---

### DAY 41 — Node.js and Backend for Frontend (BFF)

**Why it matters:** Senior frontend engineers at Google and Meta are expected to build and reason about BFFs, API gateways, and server-side rendering servers. Understanding Node.js deeply also helps with build tool reasoning.

**Study Agenda (75 min)**

- Node.js event loop: how it differs from browser event loop
- libuv: thread pool, I/O operations
- Streams: readable, writable, transform, pipe chains
- Worker Threads: true parallelism in Node
- Cluster module: multi-process Node
- BFF pattern: what it solves, implementation
- Express vs Fastify — design philosophy
- API Gateway patterns
- Rate limiting on BFF
- Authentication/authorization in BFF: JWT validation, session management
- Caching at the BFF layer
- Logging and monitoring

**Hands-on (10 min)**
Design a BFF for a social media app that:
- Aggregates user profile, posts, and followers APIs
- Handles authentication
- Implements response caching
- Rate limits by user

---

**📝 Day 41 Interview Practice Questions**

1. **(Hard | Google, Meta)** What is the BFF pattern? When does it justify the added infrastructure complexity?

2. **(Medium | All Companies)** How is Node.js's event loop different from the browser's event loop? What is libuv and what does it add?

3. **(Hard | Netflix, Uber)** Design a BFF that aggregates 5 microservices into one optimized response for the mobile client. How do you handle: partial failures, timeouts, and circuit breaking?

4. **(Medium | Stripe, Adobe)** What is a Node.js Stream? When would you use streams instead of loading data into memory?

5. **(Hard | Google)** How do you handle authentication in a BFF? Compare: JWT validation, session cookies, and token forwarding.

6. **(Medium | Meta, Microsoft)** What are Worker Threads in Node.js? When would you use them?

7. **(Hard | Netflix, Google)** How do you implement rate limiting in a BFF that serves millions of requests? What algorithms can you use?

8. **(Medium | All Companies)** What is GraphQL? When would you choose it over REST for a BFF? What are its downsides?

9. **(Hard | Stripe, Airbnb)** Design the caching layer for a BFF. What do you cache, where (in-memory vs Redis), and for how long?

10. **(Medium | Meta, Google)** How do you monitor and trace requests through a BFF to downstream microservices? What tools and patterns do you use?

---

### DAY 42 — Monorepos, CI/CD, and Developer Experience

**Why it matters:** Senior engineers own the developer experience. Google, Meta, and Stripe have sophisticated monorepo setups. This is increasingly tested at staff-level interviews.

**Study Agenda (75 min)**

- Monorepo vs polyrepo — trade-offs
- Monorepo tools: Turborepo, Nx, Lerna, Bazel (conceptual)
- Package manager workspaces: npm, yarn, pnpm
- Turborepo: task graphs, caching, remote caching
- CI/CD for frontend:
  - GitHub Actions pipeline design
  - Parallel test execution
  - Preview deployments
  - Environment-based deployments
- Feature flags in CI/CD
- Semantic versioning and conventional commits
- Changesets for package versioning
- Developer Experience (DX) metrics: build time, HMR speed, test speed
- Dependency management: peer dependencies, version conflicts

**Hands-on (10 min)**
Design the CI/CD pipeline for a monorepo containing: a React app, a component library, and a Node BFF. Include: affected-only builds, parallel testing, and staging deployment.

---

**📝 Day 42 Interview Practice Questions**

1. **(Hard | Google, Meta)** Compare monorepo and polyrepo approaches. What are the real engineering trade-offs at a 500-engineer organization?

2. **(Medium | All Companies)** What is Turborepo? How does it solve the performance problem of building in a monorepo?

3. **(Hard | Stripe, Adobe)** Design a CI/CD pipeline for a monorepo with 20 packages. How do you avoid building packages that haven't changed?

4. **(Medium | Google, Microsoft)** What are "affected builds" in monorepo tools? How does Nx compute the affected graph?

5. **(Hard | Meta, Netflix)** How do you manage a component library that is a dependency of 30+ applications in a monorepo? How do you handle breaking changes?

6. **(Medium | Stripe, Airbnb)** What is semantic versioning? What is the difference between major, minor, and patch? When do you use `^` vs `~` in `package.json`?

7. **(Hard | Adobe, Google)** Design the developer experience for onboarding a new engineer into a large frontend monorepo. What tooling, documentation, and automation do you provide?

8. **(Medium | All Companies)** What is pnpm and how does it solve the `node_modules` disk space problem differently from npm/yarn?

9. **(Hard | Google, Meta)** How do feature flags integrate with CI/CD? How do you deploy code behind a flag and then gradually roll it out?

10. **(Medium | Stripe, Microsoft)** What is Conventional Commits? How does it enable automated changelog generation and semantic versioning?

---

## Week 7 (Days 43–49): Performance Deep Dive + First Full Mock

### DAY 43 — JavaScript Performance: Profiling and Optimization

**Why it matters:** JavaScript performance optimization is a dedicated interview at Netflix, Google, and senior-level at all companies. You need to both diagnose problems and implement solutions.

**Study Agenda (75 min)**

- Chrome DevTools Performance panel: flame charts, long tasks, main thread analysis
- Long Tasks: anything >50ms, blocking the main thread
- JavaScript execution cost: parsing, compilation, execution
- Web Workers: offloading to a background thread
- Memory profiling: heap snapshots, allocation timelines
- Code optimization techniques:
  - Avoid layout thrashing (revisit)
  - Virtualize long lists
  - Debounce/throttle expensive operations
  - Avoid memory leaks (revisit)
  - Efficient DOM updates (batching)
- React-specific: React Profiler, unnecessary renders, heavy computations in render
- `requestIdleCallback` for background work
- PerformanceObserver API

**Hands-on (15 min)**
Identify and fix all performance issues in this component:
```javascript
function ProductList({ products }) {
  return (
    <div>
      {products.map(product => (
        <Product
          key={product.id}
          product={product}
          calculate={expensiveCalculation(product)}
          onClick={() => handleClick(product.id)}
        />
      ))}
    </div>
  );
}
```

---

**📝 Day 43 Interview Practice Questions**

1. **(Hard | Netflix, Google)** What is a "Long Task"? How do you identify them in DevTools? What are the main causes in a React app?

2. **(Medium | All Companies)** What is a Web Worker? What can and cannot run in a Web Worker?

3. **(Hard | Google, Meta)** Implement a virtualized list with dynamic item heights that renders 1 million items with smooth 60fps scrolling.

4. **(Medium | Netflix, Airbnb)** What is `requestIdleCallback`? What is it good for and what are its limitations on mobile?

5. **(Hard | Meta, Google)** Use the React Profiler API to measure and report component render times. Implement a `withPerfTracking` HOC.

6. **(Medium | All Companies)** What is the difference between CPU profiling and memory profiling in Chrome DevTools?

7. **(Hard | Google)** Design a scheduling system that breaks a heavy computation (processing 100,000 data points) into chunks that don't block the UI thread.

8. **(Medium | Netflix, Adobe)** What is `PerformanceObserver`? What types of performance entries can you observe?

9. **(Hard | Stripe, Airbnb)** A React app re-renders 60 times per second even when nothing changes. Walk through your debugging process step by step.

10. **(Medium | All Companies)** Implement a `scheduleTask` utility that uses `requestIdleCallback` with a `setTimeout` fallback for browsers that don't support it.

---

### DAY 44 — Network Performance: Loading, Fonts, Images, Third-Party

**Why it matters:** Network performance optimization is where the highest-impact improvements live. Google's Lighthouse rules are essentially a specification for this topic.

**Study Agenda (75 min)**

- Resource prioritization: `fetchpriority` attribute, browser's default priority queue
- Critical CSS: inline above-the-fold CSS, defer non-critical
- JavaScript loading optimization: `modulepreload`, inline critical JS
- Image formats: JPEG, WebP, AVIF — compression and quality trade-offs
- Responsive images: `srcset`, `sizes`, `<picture>` element
- Font loading: FOIT vs FOUT, font subsetting, unicode-range
- Third-party script audit: identifying blocking scripts
- Resource hints: dns-prefetch, preconnect, preload, prefetch
- HTTP/2 push (deprecated) vs preload
- Connection pooling, keep-alive, early hints (103)
- Network waterfall analysis: identifying bottlenecks

**Hands-on (10 min)**
Design the complete resource loading strategy for a page that has: hero image, body font, 3 tracking scripts, above-fold CSS, and React bundle.

---

**📝 Day 44 Interview Practice Questions**

1. **(Hard | Google, Netflix)** What is the `fetchpriority` attribute? How does it affect resource loading order?

2. **(Medium | All Companies)** What is the difference between FOIT and FOUT? Which is better UX? How do you eliminate both?

3. **(Hard | Google, Airbnb)** Design the optimal image delivery pipeline for a product page with 10 product images, a hero banner, and user avatar.

4. **(Medium | Netflix, Stripe)** What is font subsetting? How do you subset a font for a specific language to reduce its file size?

5. **(Hard | Google)** A page has 15 third-party scripts (analytics, chat, ads, A/B testing). How do you audit, prioritize, and defer them without breaking functionality?

6. **(Medium | All Companies)** What is `<link rel="modulepreload">`? How is it different from `<link rel="preload">` for scripts?

7. **(Hard | Meta, Netflix)** Design a responsive images strategy for a global image CDN. How do you select format (WebP vs AVIF) based on browser support?

8. **(Medium | Google, Stripe)** What is HTTP 103 Early Hints? How can it improve Time to First Byte?

9. **(Hard | Airbnb, Adobe)** Implement a resource loading manager that loads scripts in the correct order while maximizing parallelism and respecting dependencies.

10. **(Medium | All Companies)** How do you measure network performance in production (not just local)? What Real User Monitoring (RUM) metrics do you track?

---

### DAY 45 — FIRST FULL MOCK INTERVIEW DAY

**Why it matters:** Theory without practice fails under interview pressure. This is your first real test — a full simulated interview with yourself playing both roles. Be brutally honest in your self-assessment.

**Mock Interview Protocol**

**Simulate a 2-hour interview loop:**

**Round 1 (45 min) — Frontend System Design**
Set a timer. Answer this question as if in a real interview:
> "Design the frontend for a ride-sharing app like Uber. The user should be able to request a ride, see real-time driver location, track trip progress, and pay on completion."

Use the design framework. Draw on paper. Speak your thoughts aloud. Time yourself.

**Round 2 (45 min) — JavaScript/React Coding**
Set a timer. Solve this:
> Implement a `<VirtualList>` component that renders only visible items in a list of 100,000 items. No external libraries. The list items can have variable heights.

**Self-Assessment (30 min)**
Rate yourself 1–10 on:
- Did you clarify requirements? (Design round)
- Did you follow the framework?
- Were your trade-off explanations precise?
- Did you complete the coding problem cleanly?
- Did you handle edge cases?
- Was your code readable?

**Expected Outcome:** Identify your top 3 weaknesses. These become priority focus areas for Phase 3.

---

**📝 Day 45 Interview Practice Questions**

1. Complete the Uber ride-sharing system design (45 min timer)
2. Complete the VirtualList component (45 min timer)
3. After both: what would an interviewer have expected that you missed?
4. Rate your overall performance out of 10 and justify
5. What are your top 3 weaknesses identified from today?

---

# Phase 3: Advanced Topics & Mock Interviews (Days 46–70)

> **Phase Goal:** Fill knowledge gaps, master advanced topics, and build mock interview endurance. Your answers should now move from "technically correct" to "impressively insightful."

---

## Week 8 (Days 50–56): Security, Testing, TypeScript Advanced

*(Days 46-49 continue performance deep-dive and second system design patterns)*

### DAY 46 — Advanced React: Concurrent Features, Suspense, Server Components

**Why it matters:** React Server Components and Concurrent Mode are the current frontier. Meta interviews specifically target engineers who understand React's direction.

**Study Agenda (75 min)**

- React Server Components (RSC): what runs on server, what on client
- RSC serialization: what can and cannot be serialized
- The "use client" and "use server" directives
- Suspense for data fetching: how it works with RSC
- `use()` hook (React 19)
- Streaming with Suspense: how chunks stream to the client
- Concurrent features: `useTransition`, `useDeferredValue`, `startTransition`
- Automatic batching in React 18
- `flushSync` — breaking out of batching when necessary
- Time-slicing: how React breaks rendering into chunks

**Hands-on (10 min)**
Identify which of these should be a Server Component vs Client Component and explain why:
- Product listing page
- Shopping cart icon with count
- Static about page
- Real-time price ticker
- Product image gallery

---

**📝 Day 46 Interview Practice Questions**

1. **(Hard | Meta, Vercel)** What are React Server Components? How are they different from SSR?

2. **(Hard | Meta)** What can and cannot be passed from a Server Component to a Client Component? Why?

3. **(Medium | All Companies)** What is `useTransition`? How does it differ from simply debouncing a state update?

4. **(Hard | Meta, Google)** How does Suspense for data fetching work? What does a component need to do to "suspend"?

5. **(Medium | All Companies)** What is the `use()` hook (React 19)? How does it change data fetching patterns?

6. **(Hard | Meta)** Design the component boundary strategy for a Next.js 14 app: what is a Server Component, what requires "use client", and why?

7. **(Medium | Netflix, Airbnb)** What is `flushSync`? When would you need to break out of React's automatic batching?

8. **(Hard | Meta, Google)** How does React time-slicing work? What happens when a high-priority update interrupts a low-priority render?

9. **(Medium | All Companies)** What is the difference between `React.Suspense` for code splitting and `Suspense` for data? Are they the same mechanism?

10. **(Hard | Meta)** How do you handle authentication in a React Server Component architecture where some pages require login?

---

### DAY 47 — Internationalization (i18n) and Localization (l10n)

**Why it matters:** Global products require i18n. Google, Meta, and Adobe are global companies. This topic appears in system design for any consumer-facing product and in component design interviews.

**Study Agenda (75 min)**

- The difference between i18n (internationalizing code) and l10n (localizing content)
- ICU message format: pluralization, gender, selects
- React-i18next / FormatJS — how they work
- Intl API: `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, `Intl.PluralRules`
- Right-to-left (RTL) support: CSS logical properties, text direction, layout mirroring
- Unicode normalization and collation
- Locale-aware sorting and searching
- String externalization patterns
- Translation workflow: extraction, translation management, import
- Dynamic locale switching without page reload
- Number formats, currency, date formats across locales

**Hands-on (10 min)**
Implement a `useTranslation` hook that:
- Loads translations lazily by locale
- Supports ICU message format for pluralization
- Falls back to a default locale

---

**📝 Day 47 Interview Practice Questions**

1. **(Medium | Google, Meta)** What is the difference between i18n and l10n? What does each involve technically?

2. **(Hard | Adobe, Google)** How do you implement Right-to-Left (RTL) layout in a React app? What changes are needed in CSS? In JavaScript?

3. **(Medium | All Companies)** What is the `Intl` API? Implement locale-aware date formatting that handles: different date formats, relative times, and timezone display.

4. **(Hard | Meta, Adobe)** Design the i18n architecture for a large app with 5M strings in 30 languages. How do you load, cache, and update translations?

5. **(Medium | Google)** What is ICU message format? Implement a message renderer that handles pluralization: "1 item" vs "N items".

6. **(Hard | Adobe, Salesforce)** How do you handle translation of content with dynamic values, HTML markup, and plural forms all at once?

7. **(Medium | Meta, Netflix)** How do you implement locale-aware string sorting? What does `Intl.Collator` give you over `Array.sort()`?

8. **(Hard | Google)** Design the translation workflow for a product — from string externalization to translation to deployment. How do you prevent untranslated strings shipping?

9. **(Medium | Adobe)** What are the accessibility implications of switching from LTR to RTL? What ARIA attributes and HTML attributes must change?

10. **(Hard | Meta, Google)** How do you dynamically switch locale in a React app without a page reload? Walk through the complete architecture.

---

### DAY 48 — Error Handling, Monitoring, and Observability

**Why it matters:** Senior engineers own the reliability of their systems. Error handling and monitoring architecture is a growing interview topic at Netflix, Stripe, and Google.

**Study Agenda (75 min)**

- Error boundaries in React: what they catch, what they miss
- Global error handling: `window.onerror`, `window.addEventListener('unhandledrejection')`
- Error reporting services: Sentry, Datadog, custom implementations
- Structured error logging: what data to capture with an error
- Source maps for production debugging
- Real User Monitoring (RUM): Web Vitals, custom metrics
- Feature flag + error rate integration: automatic rollback
- A/B testing instrumentation at the frontend layer
- Canary deployments and gradual rollouts
- User session replay: Hotjar, FullStory — privacy considerations
- `performance.mark()` and `performance.measure()` for custom metrics

**Hands-on (10 min)**
Design an error monitoring system that:
- Captures all JS errors with user context
- Deduplicates the same error
- Respects user privacy (strips PII)
- Rate-limits to avoid flooding the server

---

**📝 Day 48 Interview Practice Questions**

1. **(Hard | Netflix, Stripe)** Design a production error monitoring system for a React SPA. What data do you capture? How do you avoid sending sensitive data?

2. **(Medium | All Companies)** What does React's `ErrorBoundary` catch and what does it miss? Why can't it catch async errors?

3. **(Hard | Google, Meta)** How do you use source maps for debugging minified production code? What are the security implications of making source maps public?

4. **(Medium | Stripe, Netflix)** How do you correlate frontend errors with backend errors in a distributed system? What trace IDs do you need?

5. **(Hard | Netflix)** Design an automated rollback system that detects when an error rate spikes after a deployment and reverts to the previous version.

6. **(Medium | All Companies)** What is Real User Monitoring (RUM)? How is it different from synthetic monitoring (Lighthouse)?

7. **(Hard | Stripe, Google)** How do you implement structured error logging that includes: component stack, user ID (hashed), browser info, and custom context without polluting production logs?

8. **(Medium | Meta, Adobe)** What are the privacy and legal considerations of session replay tools (Hotjar, FullStory)?

9. **(Hard | Google, Netflix)** Design a feature flag system that automatically disables a feature when its error rate exceeds a threshold.

10. **(Medium | All Companies)** Implement a `useErrorBoundary` hook that allows functional components to trigger error boundary behavior programmatically.

---

### DAY 49 — Advanced TypeScript: Complex Type Patterns

**Why it matters:** Stripe, Microsoft, and Google value TypeScript depth. Today builds on Day 18 with more complex real-world patterns.

**Study Agenda (75 min)**

- Recursive types: JSON type, deeply nested structures
- Variadic tuple types: type-safe pipe/compose
- Template literal types for route parameters
- Conditional types: distributive behavior
- `infer` in complex positions: unwrapping nested generics
- Type-level programming: type predicates, assertion functions
- Declaration files: `.d.ts` authoring
- Module augmentation and interface merging
- Covariance and contravariance (function parameter types)
- `satisfies` operator (TypeScript 4.9+)
- `const` type parameter and const assertions

**Hands-on (15 min)**
Implement these complex types:
1. `RouteParams<'/users/:id/posts/:postId'>` → `{id: string, postId: string}`
2. `Promisify<T>` that wraps all methods of an object in Promises
3. A type-safe event emitter where event names and their payload types are defined upfront

---

**📝 Day 49 Interview Practice Questions**

1. **(Hard | Stripe, Microsoft)** Implement a `RouteParams<T>` type that extracts route parameters from a URL string like `'/users/:id/posts/:postId'`.

2. **(Hard | Meta, Stripe)** Implement a type-safe EventEmitter where the event map is defined as a generic parameter and subscribers are fully typed.

3. **(Hard | Microsoft, Google)** What is variance in TypeScript? Explain covariance and contravariance in the context of function types.

4. **(Medium | Stripe, Adobe)** What is the `satisfies` operator in TypeScript? What problem does it solve that type assertions don't?

5. **(Hard | Stripe)** Implement `DeepRequired<T>` that makes all nested optional properties required.

6. **(Medium | All Companies)** What are declaration files (`.d.ts`)? When and how do you write them for a JavaScript library?

7. **(Hard | Microsoft, Stripe)** Implement a `Builder<T>` pattern where the `build()` method is only available in the type system after all required properties have been set.

8. **(Medium | Google, Adobe)** What is module augmentation in TypeScript? Show an example of adding properties to an existing third-party type.

9. **(Hard | Stripe, Meta)** Implement a type-safe `pick` that also works with nested key paths: `pick(obj, ['a.b.c', 'd'])`.

10. **(Medium | Microsoft)** What is the difference between `readonly` arrays, `as const` assertions, and `Readonly<T>`?

---

### DAY 50 — Security Deep Dive: Advanced Frontend Security

**Why it matters:** Building on Day 13, this goes deeper into security for senior engineers who are expected to own the security posture of their applications.

**Study Agenda (75 min)**

- Supply chain attacks: npm dependency hijacking, typosquatting
- Content Security Policy level 3: `strict-dynamic`, nonce rotation
- Trusted Types API: preventing DOM XSS at the platform level
- Sanitization APIs: DOMPurify vs native `setHTML()` (Sanitizer API)
- Browser isolation: iframe sandbox attributes
- Origin isolation: `COOP`, `COEP`, `CORP` headers for Spectre mitigation
- OAuth 2.0 / OIDC from the frontend: PKCE, token storage
- JWT security: where to store tokens (memory vs localStorage vs httpOnly cookie)
- GraphQL security: query depth limits, query cost analysis, batching attacks
- Subresource Integrity (SRI) revisited
- Permission Policy (Feature Policy): controlling browser features

**Hands-on (10 min)**
Design the complete authentication token storage strategy for a SPA:
- Where is the access token stored?
- Where is the refresh token stored?
- What are the attack vectors for each choice?
- What mitigations do you apply?

---

**📝 Day 50 Interview Practice Questions**

1. **(Hard | Stripe, Google)** Where should you store JWT tokens in a browser? Compare localStorage, sessionStorage, memory, and httpOnly cookies. What are the attack vectors for each?

2. **(Hard | Meta, Google)** What are supply chain attacks in the npm ecosystem? How do you protect against them in a large frontend project?

3. **(Medium | Stripe, Adobe)** What is the Trusted Types API? How does it prevent DOM XSS at the browser level?

4. **(Hard | Google)** What are `COOP`, `COEP`, and `CORP` headers? Why were they introduced after Spectre?

5. **(Medium | All Companies)** Explain the OAuth 2.0 PKCE flow for a SPA. Why is PKCE required for SPAs instead of the regular authorization code flow?

6. **(Hard | Stripe, Meta)** What are the security risks of storing authentication in localStorage? How does `httpOnly` cookie storage mitigate them?

7. **(Medium | Google)** What are the `sandbox` attributes of an `<iframe>`? When would you use `allow-scripts` and what security contract does it create?

8. **(Hard | Adobe, Salesforce)** What are the security risks specific to GraphQL? How do you implement query depth limits and cost analysis on the client?

9. **(Medium | Stripe)** What is `strict-dynamic` in CSP? How does it simplify CSP management for apps that dynamically load scripts?

10. **(Hard | Google, Meta)** Design the complete security architecture for a banking SPA: authentication, authorization, CSRF, XSS, CSP, and input validation.

---

### DAY 51 — Accessibility Advanced: Complex Patterns & ARIA Authoring

**Day Study Focus:** Deep ARIA patterns — data grids, trees, comboboxes, date pickers. Screen reader testing methodology. Building accessible custom components from scratch. Focus management in single-page applications.

---

**📝 Day 51 Interview Practice Questions**

1. **(Hard | Adobe, Google)** Implement an accessible date picker that supports: keyboard navigation through calendar, screen reader announcements, and range selection.

2. **(Hard | Salesforce, Adobe)** Implement an accessible tree view component (like a file explorer) with full keyboard navigation and ARIA tree role.

3. **(Medium | All Companies)** How do you manage focus in a SPA when navigating between routes? What problems occur without focus management?

4. **(Hard | Meta, Adobe)** Implement a `FocusTrap` component that constrains focus to a container (for modals, drawers) and restores focus on close.

5. **(Medium | Google)** What is the difference between `aria-label`, `aria-labelledby`, and `aria-describedby`? When do you use each?

6. **(Hard | Adobe, Salesforce)** Build an accessible data table with: sortable columns, row selection, pagination, and inline cell editing.

7. **(Medium | All Companies)** What is `role="status"` vs `role="alert"` vs `aria-live="polite"`? When do you use each?

8. **(Hard | Airbnb, Adobe)** How do you make a drag-and-drop interface accessible to keyboard and screen reader users?

9. **(Medium | Google)** What is a skip link? Implement one correctly and explain when it can be visually hidden.

10. **(Hard | Adobe)** Design an accessibility testing process for a large React codebase — automated checks in CI, manual audit schedule, and screen reader testing protocol.

---

### DAY 52 — SECOND FULL MOCK INTERVIEW DAY

**Mock Round 1 (45 min) — Behavioral Interview**
Answer these questions as if in a real interview. Use STAR format. Record yourself if possible.

1. Tell me about a time you made a significant architectural decision that turned out to be wrong. What happened and what did you do?
2. Describe the most complex technical problem you've solved. Walk me through your approach.
3. How have you influenced technical direction without direct authority?
4. Tell me about a conflict with a team member over a technical decision. How did you resolve it?

**Mock Round 2 (45 min) — Frontend System Design**
> "Design the frontend for a Google Maps-like application. Users can search for places, get directions, and see real-time traffic."

**Self-Assessment (20 min)**
Compare to your Day 45 mock. What improved? What weaknesses remain?

---

**📝 Day 52 Interview Practice Questions**

1. What did you do better in this mock compared to Day 45?
2. What technical areas did you stumble on? These become next sprint priorities.
3. Did your behavioral answers feel authentic or rehearsed?
4. In the system design: did you proactively mention performance, accessibility, and security?
5. Did you manage time correctly (not spending too long on one section)?

---

### DAYS 53–63: Advanced Patterns, Node Deep Dive, Third Mock

*The following days cover: Advanced React patterns (Day 53), GraphQL deep dive (Day 54), Animation & Canvas (Day 55), Monorepo advanced (Day 56), Coding sprint week (Days 57–60), Third full mock (Day 61), Gap analysis (Days 62–63)*

---

### DAY 53 — Advanced Patterns: Compound Components, Headless UI

**📝 Day 53 Interview Practice Questions**

1. **(Hard | Meta, Airbnb)** What is the Headless UI pattern? Implement a headless `<Select>` component that provides behavior with no default styling.

2. **(Hard | Airbnb, Adobe)** Implement the Compound Component pattern for a `<Menu>` with `<Menu.Item>`, `<Menu.Trigger>`, and `<Menu.List>`.

3. **(Medium | All Companies)** What is the Render Props pattern? When did it fall out of favor and what replaced it?

4. **(Hard | Meta)** Implement a polymorphic `<Box>` component in TypeScript where the `as` prop changes the element type and the accepted props.

5. **(Hard | Airbnb, Stripe)** Design a `useControllable` hook that allows a component to work in both controlled and uncontrolled modes.

6. **(Medium | Google, Adobe)** What is the "inversion of control" pattern in component APIs? How does it give users more flexibility?

7. **(Hard | Meta, Airbnb)** Implement a `<Tabs>` component using the Context + Compound Component pattern. It should be fully flexible and not prescribe any layout.

8. **(Medium | All Companies)** What is the Observer pattern and how does it relate to React's reactivity model?

9. **(Hard | Stripe, Adobe)** Implement a generic `<Form>` system using render props or hooks that manages: field registration, validation, submission, and error display.

10. **(Medium | Meta, Airbnb)** When would you choose a render prop over a custom hook? Are there cases where render props are still the better choice?

---

### DAY 54 — GraphQL Frontend Architecture

**📝 Day 54 Interview Practice Questions**

1. **(Hard | Meta, Airbnb)** How does Apollo Client's caching work? What is normalization and how does it prevent duplicate data?

2. **(Medium | Meta)** What is a GraphQL fragment? How do you use Relay-style fragments for colocation?

3. **(Hard | Meta, Airbnb)** Compare Apollo Client, React Query (with REST), and Relay. When would you choose each?

4. **(Medium | All Companies)** What is optimistic UI in Apollo? How does `optimisticResponse` work?

5. **(Hard | Meta)** What is Relay's "data masking"? How does it prevent components from accessing data they didn't explicitly request?

6. **(Medium | Stripe, Adobe)** What are GraphQL subscriptions? How do they differ from queries and mutations on the client?

7. **(Hard | Meta, Airbnb)** How do you handle pagination in GraphQL? Compare offset, cursor, and Relay Connections pattern.

8. **(Medium | Google)** What is schema stitching and federation in GraphQL? How do they affect the frontend consumer?

9. **(Hard | Meta)** Design the data fetching architecture for a React app using GraphQL: colocation, fragments, cache normalization, and real-time updates.

10. **(Medium | All Companies)** What is the N+1 problem in GraphQL? How does DataLoader on the server solve it?

---

### DAYS 55–63 — Advanced Topics Sprint

**Day 55:** Web Animations, Canvas, WebGL
**Day 56:** Advanced Build Tools, Webpack internals
**Day 57:** Coding Sprint — Array/String problems
**Day 58:** Coding Sprint — Tree/Graph problems  
**Day 59:** Coding Sprint — Dynamic programming basics
**Day 60:** Coding Sprint — Frontend-specific implementations
**Day 61:** THIRD FULL MOCK INTERVIEW (Full loop: coding + system design + behavioral)
**Day 62:** Gap analysis — identify remaining weak spots
**Day 63:** Deep revision on identified weak spots

---

**📝 Day 55 — Web Animation Interview Practice Questions**

1. **(Hard | Adobe, Netflix)** Compare CSS animations, Web Animations API, and JavaScript-driven animations (requestAnimationFrame). When do you use each?

2. **(Medium | All Companies)** What is the difference between animating with `transform` vs `top/left`? Which is always preferable and why?

3. **(Hard | Adobe)** Implement a spring-physics animation system using `requestAnimationFrame` that simulates a spring with configurable stiffness and damping.

4. **(Medium | Netflix, Airbnb)** What is the FLIP animation technique? Implement a FLIP animation for a list reorder.

5. **(Hard | Netflix)** Implement a smooth page transition system in a React SPA using the Web Animations API.

6. **(Medium | Google, Adobe)** What is `will-change`? When does it help animations and when does it hurt?

7. **(Hard | Adobe)** Design a canvas-based particle system that renders 10,000 particles at 60fps. How do you optimize it?

8. **(Medium | All Companies)** What is `prefers-reduced-motion`? Implement a hook `useReducedMotion()` that respects user preferences.

9. **(Hard | Netflix)** How does the Intersection Observer enable scroll-triggered animations without scroll event listeners?

10. **(Medium | Adobe, Airbnb)** Implement a `useSpring` hook that interpolates a value from 0 to 1 using spring physics.

---

**📝 Day 57–60 — Coding Sprint Interview Questions**

**Day 57: Array/String**
1. **(Medium)** Implement a function that finds all anagrams of a pattern in a string.
2. **(Hard)** Implement sliding window maximum for a stream of numbers.
3. **(Medium)** Implement `String.prototype.trim` from scratch.
4. **(Hard)** Implement a function that parses a mathematical expression string and evaluates it.
5. **(Medium)** Given a list of intervals, merge overlapping ones.

**Day 58: Tree/DOM Traversal**
1. **(Hard)** Implement `JSON.stringify` from scratch.
2. **(Medium)** Serialize and deserialize a component tree to JSON.
3. **(Hard)** Find the deepest common ancestor of two DOM nodes.
4. **(Medium)** Implement `document.querySelectorAll` for `.class` and `#id` selectors.
5. **(Hard)** Flatten a deeply nested comment thread into a flat list with depth info.

**Day 59: Dynamic Programming (Frontend Flavor)**
1. **(Medium)** Implement memoization for recursive Fibonacci.
2. **(Hard)** Implement a diff algorithm for two arrays (LCS-based).
3. **(Medium)** Given user session events, find the longest active session.
4. **(Hard)** Implement the Myers diff algorithm (simplified) used in React reconciliation.
5. **(Medium)** Given a list of prices over time, find the maximum profit from one buy/sell.

**Day 60: Frontend-Specific**
1. **(Hard)** Implement `Promise.all`, `Promise.race`, `Promise.any`, and `Promise.allSettled` from scratch.
2. **(Medium)** Implement a pipe function that supports async functions.
3. **(Hard)** Implement a simple virtual DOM and reconciliation from scratch.
4. **(Medium)** Implement a tagged template literal for generating safe HTML (like `html\`<b>${name}</b>\``).
5. **(Hard)** Implement a reactive store using Proxy that triggers subscribers when any property changes.

---

**📝 Day 61 — Third Full Mock Interview Questions**

Full interview loop simulation:

**Round 1 (45 min) — Coding:**
> Implement a `LRU Cache` class with a capacity limit. O(1) get and put. Then extend it to support TTL expiration.

**Round 2 (45 min) — System Design:**
> "Design a notification system for a social platform. Users can receive: in-app notifications, push notifications (mobile web), and email digests. The system must handle 100M users."

**Round 3 (30 min) — Behavioral:**
1. Tell me about a time you had to significantly refactor a system that other teams depended on.
2. How do you prioritize technical debt vs feature work?
3. Tell me about a time you disagreed with your manager's technical decision.

**Self-Assessment:**
- System Design score: /10
- Coding score: /10
- Behavioral score: /10
- Overall readiness estimate: /100

