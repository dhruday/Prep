# 00 — Quick Start: Framework, Mental Models & Interview Formula

> Read this FIRST before any topic. It gives you the reusable thinking patterns.

---

## 🧠 The Universal Interview Formula (RADTS)

```
R — Requirements    (Clarify before you design. Never skip this.)
A — Architecture    (Draw boxes and arrows. Name every component.)
D — Deep Dive       (Pick 2-3 hard problems and go deep.)
T — Trade-Offs      (Every decision needs a "why this, not that".)
S — Scale           (Show you can think from 10K to 100M users.)
```

Use RADTS in EVERY interview. It structures your thinking and signals seniority.

---

## 📋 Requirement Gathering — Master Question List

Always ask these BEFORE drawing anything:

### Scale & Users
- How many DAU (Daily Active Users)?
- What's the expected peak concurrent users?
- Global or single-region?
- Mobile + Desktop or Desktop only?

### Features
- What's the MVP vs. nice-to-have?
- Real-time collaboration needed?
- Offline support required?
- Any bulk operations (import/export)?

### Enterprise / Business
- Multi-tenant architecture?
- Single Sign-On (SSO) required?
- White-labeling / theming?
- Role-based access control (RBAC)?
- Compliance requirements (GDPR, HIPAA, SOC2)?

### Technical Constraints
- Existing tech stack / frameworks?
- SLA requirements? (99.9% uptime = 8.7 hrs downtime/year)
- Performance budget? (FCP < 2s? LCP < 2.5s?)
- Browser support requirements?
- Internationalization (i18n)?

---

## 🏗️ Architecture Mental Models

### Mental Model 1: The 3-Layer Frontend

```
┌─────────────────────────────────────┐
│         PRESENTATION LAYER          │  ← Components, Pages, UI
├─────────────────────────────────────┤
│         STATE LAYER                 │  ← Store, Cache, Local State
├─────────────────────────────────────┤
│         DATA LAYER                  │  ← API calls, WebSockets, IndexedDB
└─────────────────────────────────────┘
```

### Mental Model 2: Component Decision Tree

```
Is this a visual element?
  → YES: Is it reusable across features?
      → YES: Design System component (Button, Input, Modal)
      → NO:  Feature component (InboxRow, ChatBubble)
  → NO: Is it logic only?
      → YES: Custom Hook (useWebSocket, useVirtualList)
      → NO:  Context Provider / Store slice
```

### Mental Model 3: When to Use What for Real-Time

```
Need real-time? →
  Updates < 1/sec?   → Polling (simple, reliable)
  Updates 1-10/sec?  → Server-Sent Events (one-way, easy)
  Bidirectional?     → WebSocket (chat, collaboration)
  Huge scale?        → WebSocket + message queue backend
```

### Mental Model 4: Caching Decision Tree

```
Data changes HOW often?
  Never (static)      → CDN + Cache-Control: max-age=31536000
  Hours (semi-static) → CDN + stale-while-revalidate
  Minutes (fresh)     → React Query with staleTime: 5min
  Seconds (live)      → No cache, streaming or WebSocket
  User-specific       → No CDN cache, browser cache only
```

---

## ⚡ Performance Engineering — 5 Core Weapons

### 1. Bundle Splitting
```javascript
// Instead of one giant bundle:
import HeavyChart from './HeavyChart';  // ❌ blocks initial load

// Use dynamic import:
const HeavyChart = lazy(() => import('./HeavyChart'));  // ✅
```

### 2. Virtualization (for long lists)
```
Problem: 10,000 email rows = 10,000 DOM nodes = browser crash
Solution: Render only visible rows (+ buffer)

Visible area shows 20 rows → Render 40 rows → Feels like infinite scroll
Use: react-window or react-virtual
```

### 3. Memoization — The 3 Rules
```javascript
// Rule 1: useMemo for expensive calculations
const sorted = useMemo(() => emails.sort(compareFn), [emails]);

// Rule 2: useCallback for callbacks passed to children
const handleClick = useCallback(() => open(id), [id]);

// Rule 3: React.memo for components with stable props
const EmailRow = React.memo(({ email }) => <div>{email.subject}</div>);

// ⚠️ WARNING: Don't over-memoize! Profile first.
```

### 4. Rendering Optimization
```
Re-render happens when: state changes, props change, context changes

Solutions:
- Split context (AuthContext vs ThemeContext vs DataContext)
- Use selectors (only subscribe to the slice you need)
- Debounce expensive renders (search input → debounce 300ms)
```

### 5. API Optimization
```
Strategies:
1. Batching     → Combine multiple API calls into one
2. Pagination   → Never load all data at once
3. Prefetching  → Load next page before user asks
4. Deduplication→ React Query dedupes identical concurrent requests
5. Optimistic UI→ Update UI before server confirms (feels instant)
```

---

## 🔐 Security — The 5 Must-Know Threats

### 1. XSS (Cross-Site Scripting)
```
Attack: Injecting malicious JS via user input
Defense: 
  - Never dangerouslySetInnerHTML with user data
  - Use CSP (Content Security Policy) headers
  - Sanitize: DOMPurify library
  - React escapes by default ✅
```

### 2. CSRF (Cross-Site Request Forgery)
```
Attack: Trick user's browser to make unwanted requests
Defense:
  - CSRF tokens in every state-changing request
  - SameSite=Strict cookies
  - Check Origin/Referer headers server-side
```

### 3. Auth Token Handling
```
DON'T store JWT in localStorage → XSS can steal it
DO store JWT in httpOnly cookie → JS can't access it
For SPAs: Use short-lived access token (15min) + refresh token rotation
```

### 4. Clickjacking
```
Attack: Iframe your site and trick users into clicking
Defense: X-Frame-Options: DENY or CSP frame-ancestors 'none'
```

### 5. Sensitive Data in Frontend
```
NEVER put API keys in frontend code → use backend proxy
NEVER log sensitive data to console in production
Use environment variables + backend-for-frontend (BFF) pattern
```

---

## ♿ Accessibility — The Core Rules

### WCAG 2.1 Levels (remember this)
```
Level A   → Must have (critical barriers removed)
Level AA  → Should have (most companies target this)
Level AAA → Nice to have (rarely required)
```

### The 4 POUR Principles
```
P — Perceivable   → Can users perceive all content? (alt text, captions)
O — Operable      → Can users operate with keyboard? (focus, shortcuts)
U — Understandable→ Is UI predictable and clear? (labels, error messages)
R — Robust        → Works with assistive tech? (ARIA, semantic HTML)
```

### Quick ARIA Rules
```html
<!-- Use semantic HTML first, ARIA second -->
<button>Click me</button>           ✅ Best
<div role="button">Click me</div>   ⚠️  Only if needed
<div onclick="...">Click me</div>   ❌  Never

<!-- Required ARIA patterns -->
aria-label        → Names unlabeled elements
aria-describedby  → Links to longer description
aria-expanded     → State for accordions, dropdowns
aria-live="polite"→ Announces dynamic content updates
role="alert"      → Announces errors immediately
```

---

## 📊 Scalability — The User Scale Map

### 10K Users — Keep It Simple
- Monolithic SPA (Create React App / Vite is fine)
- CDN for static assets
- Simple REST API
- Basic caching with React Query
- Vercel/Netlify deploy

### 100K Users — Optimize
- Code splitting (reduce initial bundle)
- Image optimization + WebP
- Edge caching (Cloudflare)
- Performance monitoring (Web Vitals)
- A/B testing infrastructure

### 1M Users — Architect
- Micro frontends (team independence)
- Server-Side Rendering for SEO + speed
- Service Workers for offline/caching
- Advanced bundle analysis
- Feature flags for gradual rollout

### 100M Users — Platform
- Global CDN with edge personalization
- Streaming SSR (React 18 Suspense)
- Predictive prefetching (ML-based)
- Full observability stack
- Multi-region deployment

---

## 🗂️ Folder Structure — The Industry Standard

```
src/
├── components/          # Shared/reusable UI components
│   ├── ui/              # Primitive UI (Button, Input, Modal)
│   └── shared/          # Business-shared (UserAvatar, NotifBell)
├── features/            # Feature modules (self-contained)
│   ├── inbox/
│   │   ├── components/  # Inbox-specific components
│   │   ├── hooks/       # Inbox-specific hooks
│   │   ├── store/       # Inbox state slice
│   │   └── api/         # Inbox API calls
│   └── compose/
├── hooks/               # Global custom hooks
├── store/               # Global state (Redux/Zustand)
├── services/            # API clients, WebSocket, etc.
├── utils/               # Pure utility functions
├── types/               # TypeScript types/interfaces
├── constants/           # App-wide constants
└── pages/               # Route-level page components
```

**Why this structure?**
- Feature folders = clear ownership (team A owns `/features/inbox/`)
- Easy to micro-frontend-ize later (each feature becomes its own app)
- Scales with team size

---

## 🛑 Common Interview Red Flags to Avoid

1. **Jumping to code** before requirements are clear
2. **Choosing a tech** (WebSocket) without explaining why (vs SSE, polling)
3. **Ignoring accessibility** — always mention WCAG AA + ARIA
4. **Ignoring error states** — what happens when the API fails?
5. **Not knowing trade-offs** of your own choices
6. **Over-engineering for 10K** as if it's 100M from day one
7. **Forgetting loading states** — every async action needs a spinner
8. **No monitoring plan** — how do you know when it breaks?

---

## ✅ Staff-Level Signals (What Gets You Hired)

1. **Challenges the question** — "Is real-time actually needed, or would 5-second polling work?"
2. **Thinks about teams** — "This design lets 3 teams work independently"
3. **Mentions evolution** — "We start simple, then migrate to X when we hit Y threshold"
4. **Discusses failure modes** — "If WebSocket drops, here's the fallback"
5. **Quantifies trade-offs** — "SSR adds 50ms latency but improves FCP by 300ms"
6. **Brings real examples** — "At [previous company] we solved this by..."
7. **Proactive accessibility** — Mentions it without being asked
8. **Platform thinking** — "This becomes the foundation for the whole product"

---

*Next: Pick a design topic from INDEX.md and start with PART 3 (Requirements) → PART 4 (Architecture)*
