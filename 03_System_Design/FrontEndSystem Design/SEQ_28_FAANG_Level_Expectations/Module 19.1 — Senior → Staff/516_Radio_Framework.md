# 516. Radio Framework for Frontend System Design

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
The RADIO framework is a structured approach for tackling frontend system design interviews. RADIO stands for **R**equirements → **A**rchitecture → **D**ata Model → **I**nterfaces → **O**ptimization. It provides a repeatable, interviewer-friendly flow that ensures you cover all dimensions of a design question systematically. It's the frontend equivalent of the backend DDIA (Designing Data-Intensive Applications) framework.

**Why it exists:**
Most candidates fail frontend system design interviews not because they lack knowledge, but because they lack structure. They jump into implementation details, skip requirements, forget accessibility, or run out of time. RADIO gives you a time-boxed framework that signals Staff-level thinking.

────────────────────────────────────
## 2. The RADIO Framework
────────────────────────────────────

### **The Five Phases**

```
┌────────────────────────────────────────────────────────────────┐
│                     RADIO FRAMEWORK                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  R — REQUIREMENTS (5 min)                                      │
│  ├── Functional: What does the system do?                      │
│  ├── Non-Functional: Perf, a11y, i18n, offline, security      │
│  ├── Scope: What's in/out for this 45-min interview?           │
│  └── Constraints: Browser support, team size, timeline         │
│                                                                │
│  A — ARCHITECTURE (10 min)                                     │
│  ├── Component tree / module diagram                           │
│  ├── Client-server boundary                                    │
│  ├── State management strategy                                 │
│  ├── Rendering strategy (CSR, SSR, SSG)                        │
│  └── API layer (REST, GraphQL, WebSocket)                      │
│                                                                │
│  D — DATA MODEL (8 min)                                        │
│  ├── TypeScript interfaces for all entities                    │
│  ├── Client state shape (normalized? denormalized?)            │
│  ├── API request/response shapes                               │
│  ├── WebSocket message types (if real-time)                    │
│  └── Caching strategy (what, where, how long)                  │
│                                                                │
│  I — INTERFACES (12 min)                                       │
│  ├── Component APIs (props, events, slots)                     │
│  ├── API contracts (endpoints, methods, params)                │
│  ├── ARIA roles, keyboard navigation                           │
│  ├── Error states, loading states, empty states                │
│  └── Key code snippets (not full implementation)               │
│                                                                │
│  O — OPTIMIZATION (10 min)                                     │
│  ├── Performance: lazy load, virtualise, code split            │
│  ├── Accessibility: ARIA, focus management, screen reader      │
│  ├── Scalability: CDN, edge, micro-frontends                   │
│  ├── Security: XSS, CSRF, CSP, auth                           │
│  ├── Testing strategy: unit, integration, e2e, a11y            │
│  └── Monitoring: Core Web Vitals, error tracking               │
│                                                                │
│  Total: ~45 minutes                                            │
└────────────────────────────────────────────────────────────────┘
```

### **Phase-by-Phase Details**

────────────────────────────────────
### R — Requirements (5 minutes)
────────────────────────────────────

**Ask these questions to the interviewer:**

| Category | What to Clarify | Example for "Design Google Search" |
|----------|----------------|-------------------------------------|
| Core features | What must work? | Autocomplete, results, pagination |
| User scale | How many users? | 1B daily, 100K concurrent |
| Platform | Web, mobile web, native? | Web (desktop + mobile responsive) |
| Browser support | Modern only or legacy? | Last 2 versions of major browsers |
| Offline | Must work offline? | Not required (search needs network) |
| i18n | Multi-language? RTL? | Yes, 100+ languages, RTL support |
| A11y | WCAG level? | AA compliance |
| Auth | Logged in vs. anonymous? | Both (personalized for logged in) |

**Scope framing template:**
> "For this interview, I'll focus on [core feature], touch on [secondary], and call out [out of scope] as an extension."

────────────────────────────────────
### A — Architecture (10 minutes)
────────────────────────────────────

**Draw these diagrams:**

```
1. Component Hierarchy (React/Angular component tree)

   <App>
   ├── <Header>
   │   ├── <Logo>
   │   └── <SearchBar>
   │       ├── <SearchInput>
   │       └── <AutocompleteDropdown>
   ├── <SearchResults>
   │   ├── <ResultCard> × N
   │   └── <Pagination>
   └── <Footer>

2. Data Flow Diagram

   User types → Debounce → API call → Transform → State → UI
                                                    ↑
                                              Cache layer

3. Client-Server Boundary

   ┌─────────────────────────────────────────────┐
   │ CLIENT                                        │
   │ [SearchBar] → [API Client] → [State Store]  │
   └───────────┬──────────────────────────────────┘
               │ HTTPS
   ┌───────────▼──────────────────────────────────┐
   │ SERVER                                        │
   │ [BFF/API Gateway] → [Search Service] → [DB]  │
   └──────────────────────────────────────────────┘
```

**Architecture decisions to call out:**

| Decision | Options | Recommendation | Why |
|----------|---------|----------------|-----|
| Rendering | CSR, SSR, SSG | SSR for first page, CSR after | SEO + fast FCP, then SPA UX |
| State | Redux, Context, Zustand | Zustand or React Query | Less boilerplate, cache built-in |
| API | REST, GraphQL | REST for search, GraphQL for profile | Search is simple query, profile has nested data |
| Real-time | Polling, SSE, WS | SSE for live results | Server-push only, auto-reconnect |

────────────────────────────────────
### D — Data Model (8 minutes)
────────────────────────────────────

```typescript
// Core entities — show complete TypeScript interfaces
interface SearchQuery {
  query: string;
  filters: SearchFilters;
  page: number;
  pageSize: number;
  locale: string;
}

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  url: string;
  favicon: string;
  timestamp: string;
  type: 'web' | 'image' | 'video' | 'news';
}

interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  spelling?: { corrected: string; original: string };
  relatedSearches: string[];
  timing: { took: number };
}

// Client state
interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: Error | null;
  page: number;
  totalPages: number;
  autocompleSuggestions: string[];
}
```

────────────────────────────────────
### I — Interfaces (12 minutes)
────────────────────────────────────

**Component API:**
```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  placeholder?: string;
  debounceMs?: number;
  ariaLabel?: string;
}
```

**API Contract:**
```
GET /api/search?q={query}&page={page}&size={size}&locale={locale}
→ SearchResponse

GET /api/autocomplete?q={prefix}&limit=10
→ { suggestions: string[] }
```

**ARIA Pattern:**
```
<div role="combobox" aria-expanded="true" aria-haspopup="listbox">
  <input role="searchbox" aria-autocomplete="list"
         aria-controls="suggestions" aria-activedescendant="suggestion-2" />
  <ul role="listbox" id="suggestions">
    <li role="option" id="suggestion-1">...</li>
    <li role="option" id="suggestion-2" aria-selected="true">...</li>
  </ul>
</div>
```

────────────────────────────────────
### O — Optimization (10 minutes)
────────────────────────────────────

| Category | Optimization | Impact |
|----------|-------------|--------|
| **Performance** | Debounce autocomplete (300ms) | Reduce API calls 10× |
| **Performance** | Virtual scroll for long results | Bounded DOM |
| **Performance** | Image lazy loading (`loading="lazy"`) | Reduce initial payload |
| **A11y** | Combobox ARIA pattern | Screen reader support |
| **A11y** | Focus management on results load | Keyboard navigation |
| **Security** | Sanitize search results (DOMPurify) | Prevent stored XSS |
| **Security** | Rate limiting on autocomplete API | Prevent abuse |
| **Scale** | CDN for static assets | Global latency |
| **Scale** | Edge SSR for personalization | Reduce TTFB |
| **Monitoring** | Core Web Vitals (LCP, CLS, INP) | Track user experience |
| **Testing** | axe-core in CI, Playwright e2e | Catch regressions |

────────────────────────────────────
## 3. Time Boxing Strategy
────────────────────────────────────

| Phase | Minutes | Signal You're Sending |
|-------|---------|----------------------|
| R (Requirements) | 5 | "I clarify before building" |
| A (Architecture) | 10 | "I think in systems, not features" |
| D (Data Model) | 8 | "I design contracts before code" |
| I (Interfaces) | 12 | "I can implement what I designed" |
| O (Optimization) | 10 | "I think about production, not just correctness" |

**If you're running short on time** (35 min instead of 45):
- Trim D to 5 min (show key interfaces only)
- Trim O to 5 min (mention categories, deep-dive on 2)

────────────────────────────────────
## 4. RADIO Applied to Common Questions
────────────────────────────────────

| Question | R Focus | A Focus | D Focus | I Focus | O Focus |
|----------|---------|---------|---------|---------|---------|
| Google Docs | Collab, offline | CRDT, WS, SFU | Document model | Editor API, cursor presence | Conflict resolution, offline sync |
| News Feed | Infinite scroll, engagement | SSR + SPA, cache | Post, User, Comment | Feed API, Card component | Virtualization, prefetch, a11y |
| Chat App | Real-time, groups | WS, SFU | Message, Room, User | Message input, list | Virtualization, optimistic, encryption |
| E-commerce | Product, cart, checkout | Micro-FE, SSR | Product, Cart, Order | PDP, Cart, Checkout wizard | Perf (LCP), a11y, security (payments) |

────────────────────────────────────
## 5. Memory Aid
────────────────────────────────────

**RADIO:** Requirements → Architecture → Data Model → Interfaces → Optimization

**If you go blank:** "Start by clarifying requirements for 5 minutes. Then draw the architecture. Define data types. Show component interfaces with ARIA. End with optimization across perf, a11y, security, and scale."

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

**Why it matters:** → Structure is what separates a senior answer from a mid-level one. Interviewers have a rubric — RADIO hits every section of that rubric systematically.

**Company relevance:**
→ **Google:** L5+ frontend system design rounds explicitly expect structured approach. RADIO covers their rubric: requirements → design → API → optimization → trade-offs.
→ **Microsoft:** Similar rubric — they call it "Design Thinking" in their interview guides.
→ **SAP (Hruday):** Architecture ownership and structured communication map directly to Hruday's micro-frontend design experience.
