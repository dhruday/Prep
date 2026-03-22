# 201. SPA Architecture
**Phase:** Performance & Architecture | **Sequence:** 10 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds.

"SPA — Single Page Application — loads once and then navigates between views without full page reloads. The browser downloads the app shell on first load, and from then on only data is exchanged with the server, not full HTML. I've built SPAs with Angular at Bosch, Oracle, and Capgemini, and with React at SAP. The core trade-off is great interactivity and fast navigation after initial load — but the initial load is heavy, and SEO requires extra work. Understanding when SPA is the right choice vs SSR or hybrid is the senior-level question."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists
A Single Page Application is a web app that loads a single HTML page on first request and dynamically updates the page content using JavaScript — no full server roundtrip for navigation.

**Why SPAs exist:**
Traditional multi-page apps reloaded the entire page for every navigation, causing flickering and slow UX. SPAs eliminated this by handling routing in the browser, creating app-like experiences on the web.

### How It Works Internally

**Initial Load:**
```
1. Browser requests /products/123
2. Server returns: index.html + main.js bundle
3. Angular/React boots up
4. App router reads current URL (/products/123)
5. Router renders the ProductDetail component
6. ProductDetail fetches data from /api/products/123
7. User sees the page
```

**Navigation (no page reload):**
```
1. User clicks "Go to Cart"
2. Angular Router / React Router intercepts the click
3. Route changes to /cart — NO server request for HTML
4. Cart component renders
5. Cart data fetched from /api/cart
6. URL updates via History API (pushState)
7. User sees Cart instantly (no white flash)
```

**Key browser API: History API**
```javascript
// What the router uses internally
history.pushState({}, '', '/cart');       // update URL without reload
window.addEventListener('popstate', ...); // handle back/forward buttons
```

### Architecture & Component Boundaries

```
SPA Application Architecture:

Browser
  └── index.html (one file — the shell)
        └── <app-root> / <div id="root">
              ├── App Bootstrap (Angular module / React root)
              │     ├── Router (intercepts URL changes)
              │     ├── State Store (NgRx / Redux)
              │     ├── Auth Service
              │     └── HTTP Interceptors
              │
              └── Route Components (lazy loaded)
                    ├── /home → HomeComponent
                    ├── /products → ProductListComponent
                    └── /products/:id → ProductDetailComponent
```

### Data Flow & State Flow
```
URL change
  → Router activates route component
  → Route component reads URL params
  → Component dispatches load action (NgRx) or calls API
  → Response goes into store / local state
  → Component renders
  
Back navigation:
  → Router activates previous route
  → Component reads cached state from store (if implemented)
  → No API call needed (cache hit)
```

### Performance Implications

**Problems:**
- **Large initial bundle:** First load downloads ALL the JavaScript. Mitigated with lazy loading
- **Blank screen on first load:** JS must download, parse, and execute before any content — bad FCP/LCP
- **No server-side HTML:** Bots and crawlers see empty HTML — bad for SEO (mitigated with SSR or pre-rendering)

**Solutions:**
- **Route-based code splitting:** Only load the JS for the current route
- **Preloading:** After initial load, quietly load next likely routes in background
- **App shell + skeleton:** Show layout structure instantly while data loads

**Real impact at SAP:**
My Lighthouse score improvement from 60→95 included converting a full SPA to use route-level lazy loading + preloading strategy — reduced initial bundle from 2.4MB to 380KB.

### Scalability Considerations
- **1K users:** SPA is perfect — simple deployment, great UX
- **100K users:** Add CDN caching for the bundle, implement route prefetching
- **10M users:** SPA bundle delivery at CDN edge + service worker for offline/caching. Consider hybrid SSR for critical landing pages

### Trade-offs
| SPA | MPA (Multi-Page App) | When to Choose SPA |
|---|---|---|
| Fast navigation after load | Full reload on navigation | App-like experiences (dashboards, tools) |
| Heavy initial load | Fast initial load | Users stay for extended sessions |
| SEO is hard | SEO is easy | App is behind auth (SEO not needed) |
| Excellent for dashboards | Better for content sites | Your product is interactive and session-based |

### ⚠️ Anti-Patterns & Pitfalls
- **No lazy loading:** Shipping one 5MB bundle on first load — always split by route
- **No loading states:** Blank content while data loads — always show skeleton or spinner
- **Memory leaks:** Subscriptions and timers not cleaned up between route navigations — Angular: use takeUntil; React: useEffect cleanup
- **No error boundaries:** One crashed component brings down the whole SPA — wrap routes in error boundaries

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
Every project I've worked on (Bosch WebSocket dashboard, Oracle finance modules, SAP BI Launchpad) was an SPA. The Bosch dashboard particularly benefited from SPA — the WebSocket connection persisted across navigation because there were no page reloads. In an MPA, that would have required reconnecting WebSocket on every page change.

**At FAANG scale:**
- **Microsoft Teams Web:** Full SPA — stays connected to SignalR (WebSocket) for real-time messaging across all navigation
- **Adobe Creative Cloud Web:** SPA with per-route lazy loading — dashboard, editor, export all load independently
- **Salesforce Lightning:** SPA shell (Aura/LWC) — component framework routes between apps without page reload
- **Cisco Webex Web:** SPA for persistent WebRTC connections during meetings

**How it evolves with scale:**
- Small scale: Pure SPA, simple Webpack config
- Medium scale: Route-level code splitting, service worker for caching
- Large scale: SPA + micro-frontends + module federation — different teams' SPAs stitched together in one shell

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "A SPA loads once and handles all navigation in the browser using the History API — no page reloads. The benefit is app-like interactivity: the Bosch dashboard I built stayed connected to WebSocket across all navigation because there were no page reloads. The trade-off is initial load time — you download the full app bundle upfront. I solved this at SAP by implementing route-based code splitting: each route loaded its own chunk, reducing initial bundle from 2.4MB to 380KB and improving LCP significantly. SPAs are ideal for authenticated, session-based applications where users stay for long periods — not ideal for content-heavy public sites where SEO and first-load speed are critical."

### Likely Follow-up Questions
1. "How do SPAs handle SEO?" → SSR for public pages, pre-rendering for static pages, or accept that auth-gated apps don't need SEO
2. "How do you prevent memory leaks in a SPA?" → Clean up subscriptions (`takeUntil` in Angular, return cleanup in `useEffect`), clear timers on unmount
3. "What is the History API?" → `history.pushState()` updates the URL without a page reload; `popstate` event handles back/forward
4. "How do you handle deep linking?" → The server must return `index.html` for all routes — configure the server with a catch-all route

### vs Alternatives
| SPA | SSR (Next.js) | Choose SPA when |
|---|---|---|
| Client-rendered | Server-rendered HTML | App is behind auth — no SEO needed |
| Excellent real-time support | Better SEO | Long user sessions (dashboards, tools) |
| Simpler deployment | More complex server | No Node.js server available |

### How to Signal Senior Thinking
> "The real question isn't SPA vs MPA — it's 'what rendering strategy does this specific page need?' Public marketing pages need SSR for SEO. Auth dashboards are perfect for SPA. Hybrid is usually the answer at FAANG scale — SPA shell with SSR for the first public route."

---

## 💻 5. Code Example

```typescript
// Angular SPA with route-level lazy loading + preloading
// This is what reduced our initial bundle 2.4MB → 380KB

import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.module')
        .then(m => m.DashboardModule)
    // Only loads dashboard.js when user navigates to /dashboard
  },
  {
    path: 'products',
    loadChildren: () =>
      import('./features/products/products.module')
        .then(m => m.ProductsModule)
  },
  {
    path: 'reports',
    loadChildren: () =>
      import('./features/reports/reports.module')
        .then(m => m.ReportsModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      // After initial load, preload all lazy modules in background
      preloadingStrategy: PreloadAllModules,
      // Scroll to top on navigation
      scrollPositionRestoration: 'top'
    })
  ]
})
export class AppRoutingModule {}
```

**Interview vs Production difference:**
In an interview, showing lazy loading is enough. In production, add `AuthGuard` on routes, `RouterPreloader` with custom strategy (preload only likely next routes based on user behavior), and error boundary components per route.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** "One HTML page, all navigation in JS — like a native app on the web"
**If you go blank:** "SPA = History API replaces server navigation. Benefits: fast UX. Cost: initial bundle size, SEO challenges."
**Mnemonic:** **LOAD** — **L**oads once, **O**nly data changes, **A**pp stays mounted, **D**ynamic routing

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Instant navigation, no page flash, persistent connections (WebSocket, WebRTC)
→ Performance: After initial load, only data travels over network — not full HTML pages
→ Business: App-like experience drives engagement for session-based products

**How it works (3 sentences):**
On first load, the browser downloads one HTML file with the JavaScript bundle. All subsequent navigation is handled by a client-side router that reads/updates the URL via the History API without making server requests for HTML. Page components fetch only the data they need from APIs, keeping network traffic minimal after initial load.

**Company relevance:**
- Microsoft: Teams Web is a SPA — expects engineers who understand bundle optimization, lazy loading, and memory leak prevention
- Adobe: Creative Cloud Web is a SPA — needs route-level code splitting expertise
- Salesforce: Lightning Experience is a SPA — engineering role expects deep SPA architecture knowledge
- Cisco: Webex Web and Meraki dashboard are SPAs — expects understanding of persistent connections in SPA context

---
**✅ Topic 201/486 complete → continuing to Topic 202: MPA Architecture**
