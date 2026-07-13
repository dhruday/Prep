---

# Phase 2: System Design & Architecture (Days 22–45)

> **Phase Goal:** Master Frontend System Design — the highest-signal interview at Google, Meta, Stripe, and Airbnb for senior roles. Build a systematic framework you can apply to any problem, then practice on 8+ canonical problems.

> **Why System Design now?** Phase 1 gave you the language. Now you use that language to design large-scale systems. Engineers who arrive at system design without strong fundamentals give shallow, buzzword-heavy answers. You will give principled, trade-off-aware answers grounded in how browsers actually work.

---

## The Frontend System Design Framework

Before any design session, always structure your answer in this order:

```
1. CLARIFY REQUIREMENTS (2–3 min)
   - Who are the users? What devices/network conditions?
   - What's the scale? (MAU, QPS, data size)
   - What are the core features? (MVP vs nice-to-have)
   - Functional vs non-functional requirements

2. HIGH-LEVEL ARCHITECTURE (3–4 min)
   - Client architecture (SPA/SSR/SSG/Islands?)
   - Component breakdown
   - Data flow
   - API contract (what does the frontend need from backend?)

3. DEEP DIVE: CORE FEATURES (10–15 min)
   - Implement the hardest parts
   - State management decisions
   - Data fetching strategy
   - Real-time/offline considerations

4. PERFORMANCE (3–4 min)
   - Initial load (LCP, FID, CLS optimization)
   - Runtime performance
   - Network optimization
   - Caching strategy

5. ACCESSIBILITY & INTERNATIONALIZATION (2 min)
   - ARIA, semantic HTML
   - RTL support, date/number formatting

6. TESTING STRATEGY (1–2 min)
   - Unit, integration, E2E
   - Visual regression

7. TRADE-OFFS & WHAT YOU'D DO DIFFERENTLY AT SCALE (2 min)
```

---

## Week 4 (Days 22–28): Frontend System Design Foundations

### DAY 22 — System Design Framework + Component Architecture Design

**Why it matters:** Interviews don't test your ability to solve one problem — they test your ability to have a structured conversation about trade-offs. The framework is your scaffold.

**Study Agenda (75 min)**

- The system design framework (above) — internalize it completely
- Component architecture principles:
  - Atomic design: atoms, molecules, organisms, templates
  - Controlled vs uncontrolled components
  - Presentation vs container components
  - Single responsibility principle for components
- API design for frontend:
  - REST vs GraphQL — when to use each
  - BFF (Backend for Frontend) pattern
  - API versioning strategies
- Pagination strategies: cursor-based vs offset-based (and why cursor wins at scale)
- Optimistic updates and conflict resolution

**Hands-on (15 min)**
Apply the design framework to: "Design a Twitter-like feed." Go through each step of the framework. Time yourself — you should complete a solid outline in 20 minutes.

**Expected Outcome:** You can walk through any design problem systematically. You never freeze at the start of a design question.

---

**📝 Day 22 Interview Practice Questions**

1. **(Hard | Google, Meta)** "Design the frontend for a Twitter-like news feed." Walk through your complete approach using the framework.

2. **(Medium | All Companies)** What is the BFF (Backend for Frontend) pattern? When is it beneficial and when is it unnecessary overhead?

3. **(Hard | Meta, Stripe)** Compare cursor-based and offset-based pagination. Why does Facebook use cursor-based? When would offset pagination be acceptable?

4. **(Medium | Airbnb, Adobe)** What is Atomic Design? How do you structure a component library using this methodology?

5. **(Hard | Stripe, Google)** Design the API contract (request/response shapes) for a complex search feature with filters, sorting, and pagination.

6. **(Medium | All Companies)** What is an optimistic update? Implement `optimisticUpdate(mutation, rollback)` as a React hook.

7. **(Hard | Meta)** How would you design the frontend architecture for an application that must work in both SPA and SSR modes depending on route?

8. **(Medium | Google, Netflix)** What is the Islands Architecture? When would you choose it over a traditional SPA?

9. **(Medium | Airbnb, Stripe)** How do you design a component API that is both flexible for advanced users and simple for beginners? Walk through a real example.

10. **(Hard | Meta, Google)** You're building a design system for 200 engineers. Walk through the architectural decisions: component API design, theming, versioning, and documentation.

---

### DAY 23 — Rendering Strategies: SPA, SSR, SSG, ISR, Streaming

**Why it matters:** Rendering architecture is a major system design topic at Netflix, Google, and Airbnb. The wrong rendering strategy can kill your Core Web Vitals. You need to be able to articulate trade-offs with precision.

**Study Agenda (75 min)**

- SPA (Client-Side Rendering): pros, cons, SEO implications, TTFB vs LCP
- SSR (Server-Side Rendering): hydration, Time to First Byte, streaming SSR
- SSG (Static Site Generation): build time, CDN delivery, when it's optimal
- ISR (Incremental Static Regeneration): stale-while-revalidate at build level
- Streaming SSR (React 18): how chunks are sent, Suspense integration
- Hydration problem: full hydration vs partial hydration vs progressive hydration
- Partial Prerendering (Next.js): static shell + dynamic islands
- Edge rendering: Vercel Edge, Cloudflare Workers
- Core Web Vitals impact of each rendering strategy

**Hands-on (10 min)**
For each of these applications, choose the rendering strategy and justify it:
1. A marketing landing page
2. A real-time stock dashboard
3. A product listing page on Amazon
4. A user's private dashboard
5. A blog with daily posts

**Expected Outcome:** You can make precise, justified rendering strategy decisions for any application.

---

**📝 Day 23 Interview Practice Questions**

1. **(Hard | Google, Netflix)** Compare SPA, SSR, SSG, and ISR. For a news website with 10M daily visitors, which would you use and why?

2. **(Hard | Meta, Airbnb)** What is the "hydration problem"? How does React 18's Selective Hydration improve on full hydration?

3. **(Medium | All Companies)** What is Streaming SSR? How does it improve Time to First Byte and First Contentful Paint?

4. **(Hard | Netflix)** Design the rendering architecture for Netflix's homepage. What parts are static, what parts are dynamic, and why?

5. **(Medium | Google, Vercel)** What is Incremental Static Regeneration? How does it differ from SSG with a cron job?

6. **(Hard | Meta)** What is partial hydration / islands architecture? When does it outperform full React SSR?

7. **(Medium | Airbnb, Stripe)** What are Core Web Vitals (LCP, INP, CLS)? How does your choice of rendering strategy impact each metric?

8. **(Hard | Google)** Explain Edge rendering. How does running JavaScript at the edge (Cloudflare Workers) change what's possible for SSR performance?

9. **(Medium | Netflix, Adobe)** What is Progressive Hydration? Implement a conceptual example of how components can hydrate on viewport entry.

10. **(Hard | Meta, Google)** You're migrating a large SPA to SSR. What are the challenges (state management, third-party scripts, browser-only APIs) and how do you address each?

---

### DAY 24 — Performance Engineering: Core Web Vitals & Optimization Strategies

**Why it matters:** Performance is a dedicated interview at Netflix and Google. At Meta and Airbnb, it's woven into every system design. You need both conceptual understanding and practical optimization techniques.

**Study Agenda (75 min)**

- Core Web Vitals 2024:
  - LCP (Largest Contentful Paint): what affects it, how to optimize
  - INP (Interaction to Next Paint, replaced FID): what it measures
  - CLS (Cumulative Layout Shift): causes and fixes
- JavaScript performance:
  - Code splitting strategies (route-level, component-level, vendor)
  - Tree shaking and dead code elimination
  - Bundle analysis tools
- Image optimization: WebP, AVIF, responsive images, lazy loading, `<picture>` element
- Font optimization: `font-display`, preloading, variable fonts
- Third-party script performance: async, defer, Partytown
- Resource hints: preload, prefetch, preconnect, dns-prefetch
- Service Workers for performance
- Performance budgets and monitoring

**Hands-on (15 min)**
Audit this hypothetical app and list 10 performance improvements with priority order:
- 3MB JavaScript bundle (no code splitting)
- No image optimization
- Google Fonts loaded synchronously in `<head>`
- All API calls on initial load (no lazy loading)
- Re-renders on every keystroke in a large list

**Expected Outcome:** You can perform a performance audit from first principles and prioritize fixes by impact.

---

**📝 Day 24 Interview Practice Questions**

1. **(Hard | Google, Netflix)** Your app has an LCP of 5.2 seconds. Walk me through your complete investigation and fix strategy.

2. **(Medium | All Companies)** What are Core Web Vitals? Explain LCP, INP, and CLS. What causes poor scores in each?

3. **(Hard | Airbnb, Netflix)** Implement a comprehensive code splitting strategy for a large React app. How do you decide what to split?

4. **(Medium | Google, Meta)** What is CLS (Cumulative Layout Shift)? List 5 common causes and their fixes.

5. **(Hard | Netflix)** Design an image optimization pipeline: from upload to delivery, covering format selection, responsive sizes, lazy loading, and CDN caching.

6. **(Medium | Stripe, Adobe)** What is `font-display: swap` and what visual artifact can it cause? How do you eliminate this artifact?

7. **(Hard | Google, Airbnb)** A page has a 4MB JavaScript bundle. Walk me through your entire process of reducing it to under 200KB for the initial load.

8. **(Medium | All Companies)** What is the Third-Party Script problem? How does Partytown or similar solutions move scripts off the main thread?

9. **(Hard | Netflix, Meta)** Implement a performance monitoring system that tracks Core Web Vitals in production and reports to an analytics service.

10. **(Medium | Google)** What is a performance budget? How do you enforce it in a CI/CD pipeline?

11. **(Hard | Airbnb)** Explain the PRPL pattern (Push, Render, Pre-cache, Lazy-load). How does it optimize app delivery?

---

### DAY 25 — Caching Strategies, CDN, and Asset Delivery

**Why it matters:** Caching is a force multiplier — it touches every layer of a system. Senior engineers must design caching at multiple levels: browser, CDN, application, API. This topic appears in almost every system design round.

**Study Agenda (75 min)**

- Browser caching (revisit with architecture focus):
  - Memory cache, disk cache, service worker cache
  - Cache invalidation strategies
- CDN architecture:
  - Origin vs edge, cache-control for CDN
  - CDN invalidation
  - Serving assets from CDN (versioned filenames, content hashing)
- Application-level caching:
  - React Query / SWR caching model
  - Normalization (Redux, Apollo)
  - Stale-while-revalidate pattern
- API response caching:
  - `ETag` + `If-None-Match` flow
  - `Last-Modified` + `If-Modified-Since`
- Service Worker caching strategies:
  - Cache First, Network First, Stale-While-Revalidate, Cache Only, Network Only
- Edge caching for personalized content (Vary header, JWT-aware caching)

**Hands-on (10 min)**
Design the complete caching strategy for an e-commerce product page: static shell, product data, user-specific data (cart, wishlist), and recommendations.

**Expected Outcome:** You can design multi-layer caching strategies for any application.

---

**📝 Day 25 Interview Practice Questions**

1. **(Hard | Stripe, Google)** Design the complete caching strategy for a SaaS dashboard with: static assets, API data, user-specific content, and real-time updates.

2. **(Medium | All Companies)** What are the 5 Service Worker caching strategies? When would you use each?

3. **(Hard | Netflix, Google)** How does content hashing (cache busting) work with long-term CDN caching? Walk through the complete deployment pipeline.

4. **(Medium | Meta, Airbnb)** What is `stale-while-revalidate`? How does React Query implement it? What are its failure modes?

5. **(Hard | Google)** How do you cache personalized content on a CDN? How does the `Vary` header help and what are its performance costs?

6. **(Medium | Netflix, Stripe)** Explain the ETag flow. When does the browser send `If-None-Match`? What does the server respond with on a cache hit?

7. **(Hard | Airbnb, Meta)** Design an offline-first architecture for a mobile web app that handles: reading cached data, queuing writes, and syncing when back online.

8. **(Medium | Adobe, Microsoft)** What is Apollo Client's normalized cache? How does it avoid duplicate data across different queries?

9. **(Hard | Google, Netflix)** Your CDN is caching an erroneous API response. You need to invalidate it globally within 60 seconds. Walk through your strategy.

10. **(Medium | Stripe, Uber)** Implement a simple `QueryCache` class that caches API responses with TTL expiration and automatic revalidation.

---

### DAY 26 — Real-Time Communication: WebSockets, SSE, Long Polling

**Why it matters:** Real-time features appear in the majority of Big Tech products — chat, live feeds, notifications, collaborative editing. Uber, Slack, and Meta specifically test this in frontend system design.

**Study Agenda (75 min)**

- Polling: short polling, long polling — when they're still appropriate
- Server-Sent Events (SSE): unidirectional, HTTP-based, reconnection logic, EventSource API
- WebSockets: full-duplex, binary support, connection management
- WebRTC: peer-to-peer, signaling, STUN/TURN (conceptual)
- Connection management:
  - Reconnection with exponential backoff
  - Heartbeat/ping-pong
  - Handling network interruption
- Scaling real-time connections:
  - Connection per-tab vs shared worker
  - Pub/Sub on the server
- Presence systems: online/offline, typing indicators
- Operational Transforms vs CRDTs (for collaborative editing — conceptual)

**Hands-on (15 min)**
Implement a WebSocket connection manager class that:
- Reconnects with exponential backoff
- Queues messages sent while disconnected
- Broadcasts connection state changes

**Expected Outcome:** You can design real-time communication systems and choose the right protocol for any use case.

---

**📝 Day 26 Interview Practice Questions**

1. **(Hard | Meta, Uber)** Compare WebSockets, Server-Sent Events, and Long Polling. For a real-time chat application, which would you use and why?

2. **(Hard | Slack/Salesforce)** Design the frontend real-time system for a Slack-like chat app. How do you handle: message delivery, typing indicators, presence, and reconnection?

3. **(Medium | All Companies)** Implement a `WebSocketManager` class that handles automatic reconnection with exponential backoff.

4. **(Hard | Uber, Google)** Design the real-time location tracking system for Uber's map view. How do you show driver location updating every 2 seconds for thousands of concurrent rides?

5. **(Medium | Meta, Airbnb)** What are Server-Sent Events? When are they preferable to WebSockets? What are their limitations?

6. **(Hard | Google, Meta)** Design the architecture for Google Docs-style collaborative editing. What is OT vs CRDT? Why does Google use OT?

7. **(Medium | Netflix)** How does Netflix handle live streaming at scale? What protocols are involved? What's HLS and how does it work?

8. **(Hard | Salesforce, Adobe)** Implement a presence system that shows who's online in a shared document. How do you handle ghost connections?

9. **(Medium | All Companies)** What is a heartbeat/ping-pong in WebSocket context? Implement this in your WebSocket manager.

10. **(Hard | Meta)** Design a notification system for a social network. How do you: deliver real-time notifications, handle the user having multiple open tabs, and sync notification read status?

---

### DAY 27 — State Management at Scale: Design Patterns

**Why it matters:** State management is one of the hardest problems in frontend at scale. At senior level, you're expected to design state architectures, not just use libraries. Meta and Airbnb probe this deeply.

**Study Agenda (75 min)**

- Types of state: server state, client state, URL state, ephemeral/UI state
- The right tool for each state type
- Flux architecture and its evolution
- Normalization: why and how (Normalizr, RTK, Apollo)
- Optimistic updates, pessimistic updates, rollback strategies
- Derived state vs stored state — the duplication anti-pattern
- URL as state — query params, React Router patterns
- Undo/redo pattern implementation
- Cross-tab state synchronization (BroadcastChannel API)
- State machines (XState concept): predictable state transitions

**Hands-on (10 min)**
Design the state architecture for a collaborative whiteboard:
- Drawing state (CRDT)
- User presence state (WebSocket)
- History state (undo/redo)
- Tool selection state (ephemeral)
- Server-synced drawing data

**Expected Outcome:** You can categorize state correctly and choose the right management solution for each type.

---

**📝 Day 27 Interview Practice Questions**

1. **(Hard | Meta, Airbnb)** Categorize all state in a Twitter-like application: local, global, server, URL. Which tool manages each and why?

2. **(Hard | Meta)** What is "normalized state"? Why does Redux Toolkit encourage it? Implement a normalized `users` and `posts` slice.

3. **(Medium | All Companies)** What is the difference between optimistic and pessimistic updates? Implement an optimistic "like" button with rollback on failure.

4. **(Hard | Google)** Implement an undo/redo system for a text editor using the Command pattern in TypeScript.

5. **(Medium | Stripe, Adobe)** What is URL state? What kinds of state should live in the URL and what shouldn't? Give examples.

6. **(Hard | Airbnb)** Design the state management architecture for Airbnb's multi-step checkout flow. Map every piece of state to its appropriate store.

7. **(Medium | Meta, Salesforce)** What is the BroadcastChannel API? Implement cross-tab cart synchronization using it.

8. **(Hard | Adobe, Microsoft)** Explain state machines. How would you model a multi-step upload flow (idle → selecting → uploading → success/error) as a state machine?

9. **(Medium | Netflix, Google)** What is derived state? What are the dangers of storing derived state and how do you handle computing expensive derived values?

10. **(Hard | Meta, Airbnb)** Compare Zustand, Jotai, and Redux Toolkit for a 200-engineer organization. What factors drive your decision?

---

### DAY 28 — Week 4 Review + Design System Deep Dive

**Why it matters:** Design systems are a frequent senior interview topic at Adobe, Airbnb, Meta, and Google. This day consolidates Week 4 and adds a high-value topic.

**Study Agenda (75 min)**

- **First 20 min:** Review the system design framework, rendering strategies, performance, caching, and state management — from memory
- **Next 35 min:** Design System deep dive:
  - Token-based design: spacing, color, typography, elevation
  - Component API design principles (polymorphism, slots, compound components)
  - Theming: CSS variables, runtime theming, build-time theming
  - Versioning and breaking changes
  - Accessibility in design systems (WCAG, ARIA contract)
  - Storybook as documentation tool
  - Design-dev handoff

**Weekly Review Checkpoint**
- [ ] Can you apply the design framework to any problem in under 5 minutes?
- [ ] Can you compare SPA/SSR/SSG/ISR with precision?
- [ ] Can you design a multi-layer caching strategy?
- [ ] Can you choose the right real-time protocol for any use case?
- [ ] Can you categorize and manage all state types in a large app?

---

**📝 Day 28 Interview Practice Questions**

1. **(Hard | Adobe, Airbnb)** "Design a design system for a company with 50 product teams." Walk through the entire architectural decision — token structure, component API, theming, documentation, versioning.

2. **(Hard | Meta, Google)** What is a design token? Design the token taxonomy for a design system that supports: multiple themes, dark mode, responsive scaling, and branding customization.

3. **(Medium | Adobe, Salesforce)** How do you handle breaking changes in a public component library? What versioning strategy do you use?

4. **(Hard | Airbnb)** Design a `Button` component API that supports: variants, sizes, icons, loading state, and polymorphism (`as` prop). Write the TypeScript type signature.

5. **(Medium | All Companies)** What is WCAG? What are the WCAG conformance levels (A, AA, AAA)? Which level do companies typically aim for?

6. **(Hard | Adobe, Meta)** Implement a slot-based component API (like Web Components' `<slot>`) in React for maximum composition flexibility.

7. **(Medium | Google, Stripe)** How do you document a component library so that: designers, junior engineers, and senior engineers all find it useful?

8. **(Hard | Airbnb, Adobe)** How would you implement runtime theming (e.g., a customer can upload their brand colors) without a build step? What are the technical constraints?

9. **(Medium | Microsoft, Salesforce)** What is Storybook? What problems does it solve and what are its limitations as a documentation tool?

10. **(Hard | Google, Meta)** Design the component API for a `DataGrid` that supports: sorting, filtering, virtual scrolling, row selection, and inline editing. What's your API surface?

---

## Week 5 (Days 29–35): System Design Practice: News Feed, Autocomplete, and Messaging

### DAY 29 — System Design: Social Media News Feed

**Why it matters:** News Feed is the canonical Meta frontend system design question. It touches rendering strategy, infinite scroll, real-time updates, caching, and performance. Every component of this design appears in real interviews.

**Study Agenda (75 min)**

Deeply design: **"Design Facebook's News Feed"**

Cover all dimensions:
- **Requirements:** infinite scroll, media (video/image), reactions, comments, real-time updates
- **Architecture:** rendering strategy (SSR first page, then SPA), component tree
- **Feed algorithm:** client-side vs server-side composition, pagination (cursor-based)
- **Media handling:** lazy loading, progressive images, video autoplay
- **Real-time updates:** new posts, like counts, comment counts
- **Performance:** virtualization for the feed, image lazy loading, code splitting
- **Offline:** what works offline vs what doesn't
- **Caching:** feed cache, media cache, invalidation
- **Accessibility:** keyboard navigation, screen reader support for dynamic content

**Hands-on (20 min)**
Draw the full system architecture diagram. Include: component hierarchy, data flow, caching layers, real-time connection.

---

**📝 Day 29 Interview Practice Questions**

1. **(Hard | Meta)** "Design the frontend for Facebook's News Feed." Walk through the complete system from architecture to implementation details.

2. **(Hard | Meta, Google)** How does infinite scroll differ from traditional pagination? Implement a cursor-based infinite scroll hook.

3. **(Medium | All Companies)** How do you virtualize a news feed? What library or technique would you use for a feed with heterogeneous item heights?

4. **(Hard | Meta, Netflix)** How do you implement autoplay video in a feed like Facebook/Instagram? What performance considerations apply?

5. **(Medium | Meta, Airbnb)** Design the "reactions" feature (Like, Love, Haha, etc.) for a post. Include optimistic updates and real-time sync.

6. **(Hard | Meta)** How do you show real-time like counts on posts without polling too frequently? Design the update strategy.

7. **(Medium | Google)** How would you make a news feed accessible? What ARIA live regions are appropriate for dynamic content?

8. **(Hard | Netflix, Meta)** Design the image loading strategy for a feed: progressive loading, LQIP (Low Quality Image Placeholders), lazy loading, and WebP/AVIF selection.

9. **(Medium | All Companies)** How do you handle "new posts available" notification in a feed without disrupting the user's reading position?

10. **(Hard | Meta, Google)** Design the feed caching strategy: what's cached, for how long, and how is it invalidated when the user posts something new?

---

### DAY 30 — System Design: Typeahead/Autocomplete

**Why it matters:** Autocomplete is asked at Google, Airbnb, and Meta. It's a focused problem that tests debouncing, caching, async handling, accessibility, and performance — all in one design.

**Study Agenda (75 min)**

Deeply design: **"Design a Typeahead/Autocomplete Component"**

- **Functional requirements:** debounced search, keyboard navigation, result highlighting, recent searches, categorized results
- **API design:** request cancellation (AbortController), result caching
- **Client-side search:** Trie data structure, fuzzy matching
- **Caching:** cache by query string, cache invalidation TTL
- **Performance:** debounce timing (150ms), request deduplication
- **Keyboard accessibility:** ARIA combobox pattern, up/down, enter, escape
- **Edge cases:** empty results, loading state, error state, offline
- **Scale:** client-side caching to avoid redundant requests for same prefix
- **Advanced:** ranking/scoring results, personalization

**Hands-on (30 min)**
Implement a fully functional Autocomplete component in React or vanilla JS with: debouncing (150ms), keyboard navigation, loading/error states, and ARIA attributes.

---

**📝 Day 30 Interview Practice Questions**

1. **(Hard | Google, Airbnb)** "Design an Autocomplete/Typeahead component." Cover API, caching, debouncing, keyboard navigation, and accessibility.

2. **(Medium | All Companies)** What debounce delay should a typeahead use? How did you arrive at that number? What are the tradeoffs of going too high or too low?

3. **(Hard | Google)** How would you implement client-side result caching so that typing "reactj", then deleting to "react" reuses the cached "react" result?

4. **(Medium | Meta, Airbnb)** What is the ARIA combobox pattern? Implement the correct ARIA attributes for a search autocomplete.

5. **(Hard | Stripe, Google)** How do you handle request cancellation in an autocomplete? Implement this using `AbortController`.

6. **(Medium | All Companies)** What's the difference between a "search as you type" vs "search on submit" UX? When would you choose each?

7. **(Hard | Google)** Implement a client-side Trie-based autocomplete that can match 100,000 words with sub-millisecond response time.

8. **(Medium | Meta, Adobe)** How do you highlight matching characters in autocomplete results? Implement `highlightMatch(text, query)`.

9. **(Hard | Airbnb, Stripe)** Design an autocomplete that supports: recent searches, trending searches, and backend suggestions — all combined into one ranked list.

10. **(Medium | Google)** How do you handle special characters and non-Latin scripts in an autocomplete? What normalizations do you apply?

---

### DAY 31 — System Design: Messaging/Chat Application

**Why it matters:** Chat is the canonical real-time problem at Slack, Meta, and Airbnb. It tests your knowledge of WebSockets, message state management, ordering, delivery guarantees, and optimistic updates.

**Study Agenda (75 min)**

Deeply design: **"Design a Messaging App (like WhatsApp Web)"**

- **Architecture:** WebSocket connection, message queue, reconnection
- **Message states:** sending → sent → delivered → read (each requires different UX)
- **Optimistic UI:** local message ID before server confirmation
- **Ordering:** timestamp-based ordering, conflict resolution
- **Loading history:** pagination (load on scroll up), virtualization
- **Media messages:** upload progress, preview before send
- **Group messaging:** at-scale notifications, delivery receipts at scale
- **Offline behavior:** queue messages, show pending state
- **Notifications:** push notifications when tab is in background
- **Search:** full-text search in message history

**Hands-on (15 min)**
Design the message state machine: idle → composing → sending → sent → delivered → read. Implement in a state machine or reducer.

---

**📝 Day 31 Interview Practice Questions**

1. **(Hard | Meta, Slack)** "Design the frontend for a WhatsApp Web-like messaging app." Complete system design.

2. **(Hard | Meta, Uber)** How do you handle message ordering in a chat app when messages can arrive out of order from the server?

3. **(Medium | All Companies)** Implement a message input that shows a character counter, supports paste-to-send images, and handles draft persistence.

4. **(Hard | Slack)** Design a typing indicator system. How do you avoid flooding the server with typing events?

5. **(Medium | Meta, Airbnb)** How do you implement message "read receipts"? What are the privacy implications and how does WhatsApp handle it?

6. **(Hard | Netflix, Meta)** Design the virtual scroll for a chat interface that loads older messages when the user scrolls up without losing their current position.

7. **(Medium | Slack, Salesforce)** How do you handle push notifications for a chat app when the user has the browser tab closed?

8. **(Hard | Meta)** Design the file upload progress UX for sending a photo in a chat. Include: preview, progress bar, cancellation, retry.

9. **(Medium | All Companies)** What is an "optimistic message ID"? Implement the mapping from local ID to server ID when the server confirms delivery.

10. **(Hard | Meta, Google)** A user sends 50 messages offline. When they reconnect, how do you send them all and maintain ordering? Handle partial failures.

---

### DAY 32 — System Design: Video Streaming Player

**Why it matters:** Netflix, YouTube, and Twitch all look for engineers who understand adaptive streaming, buffering strategies, and video performance. This is a unique but high-value design.

**Study Agenda (75 min)**

Deeply design: **"Design a Video Player like Netflix's"**

- **Streaming protocols:** HLS (HTTP Live Streaming), DASH, segments
- **Adaptive bitrate streaming:** quality selection based on bandwidth
- **Buffering strategy:** pre-buffering, buffer health monitoring
- **Video controls:** play/pause, seek, volume, fullscreen, picture-in-picture
- **Chapter/timestamp navigation**
- **Subtitles/captions:** WebVTT format, multiple language tracks
- **Accessibility:** keyboard controls, screen reader for controls
- **DRM:** EME (Encrypted Media Extensions) — conceptual
- **Performance:** lazy loading player, poster image, intersection-based autoplay
- **Error handling:** network error, codec unsupported, connection lost mid-stream
- **Analytics:** play start, buffer events, quality changes, drop rates

**Hands-on (10 min)**
Design the player state machine: idle → loading → playing → paused → buffering → error → ended.

---

**📝 Day 32 Interview Practice Questions**

1. **(Hard | Netflix, YouTube)** "Design a video player for Netflix." Walk through the complete architecture from streaming protocol to player controls.

2. **(Hard | Netflix)** What is HLS (HTTP Live Streaming)? How does adaptive bitrate work? How does the player decide to switch quality levels?

3. **(Medium | Netflix, Google)** How do you implement smooth seeking in a video player? What happens at the network level when a user seeks to a timestamp?

4. **(Hard | Netflix, Airbnb)** Design the buffering strategy for a video player. How much should you pre-buffer? How do you balance memory vs uninterrupted playback?

5. **(Medium | All Companies)** How do you implement keyboard accessibility for a video player? List all keyboard shortcuts and their ARIA requirements.

6. **(Hard | Netflix)** How does DRM (Digital Rights Management) work in the browser? What is the EME API and how does Widevine fit in?

7. **(Medium | YouTube, Google)** Implement an `autoplay-on-scroll` feature for a feed of videos. How do you handle multiple videos and performance?

8. **(Medium | Netflix, Adobe)** How do WebVTT captions work? Implement a caption renderer that syncs with video playback time.

9. **(Hard | Netflix)** Design the analytics system for a video player: what events do you track, how do you batch them, and how do you handle reporting failures?

10. **(Medium | YouTube)** How do you implement picture-in-picture for a video player? When does it fail (browser policy) and how do you gracefully degrade?

---

### DAY 33 — System Design: E-Commerce Product Page + Checkout

**Why it matters:** E-commerce covers performance (LCP for product images), forms (complex checkout), payments (Stripe integration), and SEO — making it a rich system design that tests multiple dimensions.

**Study Agenda (75 min)**

Deeply design: **"Design an E-Commerce Product Page + Checkout Flow"**

- **Product page:** rendering (SSR for SEO), structured data (JSON-LD), image gallery, variant selection
- **Cart:** local storage sync, cross-tab sync, optimistic updates
- **SEO:** Open Graph, Twitter Cards, canonical URLs, JSON-LD structured data
- **Checkout flow:** multi-step, form validation, error handling
- **Payment integration:** Stripe Elements, PCI compliance, error handling
- **Performance:** critical path for above-the-fold, lazy load below fold
- **Inventory:** real-time stock checking, "only 2 left" notifications
- **Internationalization:** currency, tax, address formats
- **Analytics:** funnel tracking, conversion events

**Hands-on (10 min)**
Design the form validation architecture for a checkout form with 15 fields. How do you handle: per-field validation, cross-field validation, server-side errors, and submission states?

---

**📝 Day 33 Interview Practice Questions**

1. **(Hard | Stripe, Airbnb)** "Design the frontend for an e-commerce checkout flow." Complete system with cart, multi-step form, payment, and confirmation.

2. **(Hard | Google, Stripe)** How would you integrate Stripe for payment processing? What is PCI compliance and how does Stripe Elements help achieve it?

3. **(Medium | All Companies)** How do you implement a persistent cart that works across sessions, devices (when logged in), and offline?

4. **(Hard | Netflix, Airbnb)** How do you implement real-time inventory updates on a product page? "Only 3 left" should update without a page refresh.

5. **(Medium | Google, Stripe)** What is JSON-LD structured data? How does it help e-commerce pages in Google Search?

6. **(Hard | Adobe, Meta)** Design a form validation system for a checkout that handles: async validation (email availability), multi-field dependencies (billing = shipping), and server errors.

7. **(Medium | All Companies)** How do you track conversion funnel events from product view to purchase? What data should each event include?

8. **(Hard | Airbnb, Stripe)** Implement an address autocomplete using the Places API that adapts the form fields based on country-specific address formats.

9. **(Medium | Google, Meta)** How do you implement product image galleries with: thumbnail navigation, zoom on hover, responsive images, and lazy loading?

10. **(Hard | Stripe, Adobe)** Design the error handling strategy for a payment form. What happens when: the card is declined, the network fails mid-submission, or the user's session expires?

---

### DAY 34 — System Design: Google Maps / Location-Based Features

**Why it matters:** Uber, Airbnb, and Google ask location-based design questions. Maps involve canvas/WebGL rendering, real-time updates, and complex user interactions.

**Study Agenda (75 min)**

Deeply design: **"Design a Google Maps-like Web Application"**

- **Map rendering:** tile-based maps, canvas/WebGL vs SVG, tile caching
- **Viewport management:** what tiles to load based on viewport + zoom level
- **Real-time markers:** thousands of markers efficiently rendered
- **Clustering:** marker clustering at different zoom levels
- **Search:** autocomplete, geocoding, reverse geocoding
- **Routing:** direction display, polyline rendering
- **Offline maps:** caching tile sets for offline use
- **Performance:** virtualization of markers, GPU-accelerated rendering
- **Accessibility:** keyboard navigation on a map

**Hands-on (10 min)**
Design the data structure for efficiently querying which map markers are currently visible in the viewport.

---

**📝 Day 34 Interview Practice Questions**

1. **(Hard | Google, Uber)** "Design a Google Maps-like application." Cover: tile loading, marker rendering, real-time updates, and search integration.

2. **(Hard | Uber)** Design the real-time driver tracking map for Uber. How do you efficiently render and update 10,000 driver positions on a map?

3. **(Medium | Google, Airbnb)** What is a map tile? How does tile-based map rendering work? What caching strategy do you apply to map tiles?

4. **(Hard | Google)** Implement a viewport-based marker virtualization system that only renders markers visible on screen.

5. **(Medium | Uber, Airbnb)** What is marker clustering? How do you implement it efficiently for large numbers of markers?

6. **(Hard | Google, Airbnb)** Design the Airbnb map search experience — as the user moves the map, listings update. How do you debounce, cache, and render the results?

7. **(Medium | Uber)** How would you implement a polyline (route) drawer on a map using Canvas API?

8. **(Hard | Google)** How do you make a map accessible? What keyboard interactions are required and how do you implement them without breaking sighted user flow?

9. **(Medium | All Companies)** What is WebGL and when would you use it for a map vs Canvas 2D vs SVG?

10. **(Hard | Airbnb)** Design the "search as you move the map" feature with: debounced requests, loading state, and results that don't jump the map position.

---

### DAY 35 — Week 5 Review + System Design Practice Session

**Why it matters:** Practice under timed conditions. System design fluency requires repetition — you must be able to structure a complete answer in 45 minutes.

**Study Agenda (75 min)**

- **First 15 min:** Review the design framework and all 5 system design patterns from Days 29–34
- **Next 45 min:** Timed design session — pick one:
  - "Design a Google Docs-style collaborative editor" (45 min)
  - "Design a Spotify Web Player" (45 min)
  - "Design Airbnb's search and listing page" (45 min)
- **Final 15 min:** Weekly checkpoint

**Weekly Review Checkpoint**
- [ ] Can you complete a full system design in 45 minutes?
- [ ] Can you discuss news feed, autocomplete, chat, video player, e-commerce?
- [ ] Can you justify every rendering strategy decision?
- [ ] Can you design a caching strategy at every layer?

---

**📝 Day 35 Interview Practice Questions**

1. **(Hard | Google, Adobe)** "Design a collaborative document editor (Google Docs)." Focus on: real-time sync, conflict resolution, offline mode, and version history.

2. **(Hard | Spotify/Netflix)** "Design a music streaming web player." Cover: audio buffering, playlist management, offline mode, and cross-device sync.

3. **(Hard | Airbnb)** "Design Airbnb's search experience." Cover: map + list view, filtering, real-time availability, pricing calendar, and mobile-first considerations.

4. **(Hard | Meta, Google)** "Design an Instagram-like photo sharing feature." Cover: upload, filters/editing, feed display, story expiry, and real-time comments.

5. **(Hard | Stripe)** "Design a Stripe Dashboard." Cover: charts/analytics, transaction list, real-time updates, CSV export, and role-based access control on the frontend.

6. **(Hard | Uber, Airbnb)** "Design a booking flow for Uber." Cover: map, driver matching animation, ride state machine, payment, and receipt.

7. **(Hard | Salesforce)** "Design a CRM contact management page." Cover: data grid with 10,000 rows, inline editing, bulk actions, and field-level validation.

8. **(Hard | Google, Microsoft)** "Design a web-based code editor (like CodeSandbox)." Cover: syntax highlighting, live preview, file tree, and collaborative editing.

9. **(Hard | Adobe)** "Design a photo editing web application." Cover: canvas operations, filter application, undo/redo, and export.

10. **(Hard | Netflix)** "Design Netflix's home page." Cover: hero content selection, category rows, continue watching, trailer previews, and rendering strategy.

