# 05 — Frontend System Design Case Studies

> **29 Frontend Machine-Coding & System Design Case Studies**
> Each with: Requirements → Component Architecture → State Management → Performance → Follow-ups → 🔥/⚠️/🧠

---

## Table of Contents

1. [Design an Infinite Scroll Feed](#1-infinite-scroll-feed)
2. [Design an Autocomplete/Search Component](#2-autocompletesearch-component)
3. [Design a Real-Time Collaborative Editor (Google Docs)](#3-real-time-collaborative-editor)
4. [Design a Chat Application UI](#4-chat-application-ui)
5. [Design a Design System / Component Library](#5-design-system--component-library)
6. [Design a Dashboard with Real-Time Charts](#6-dashboard-with-real-time-charts)
7. [Design an Image Gallery / Carousel](#7-image-gallery--carousel)
8. [Design a Form Builder](#8-form-builder)
9. [Design a Drag-and-Drop Kanban Board (Trello)](#9-drag-and-drop-kanban-board)
10. [Design a Video Player](#10-video-player)
11. [Design a Notification Center](#11-notification-center)
12. [Design a Multi-Step Wizard / Onboarding Flow](#12-multi-step-wizard)
13. [Design a Spreadsheet (Google Sheets)](#13-spreadsheet-google-sheets)
14. [Design a File Explorer (VS Code Sidebar)](#14-file-explorer)
15. [Design an Email Client (Gmail)](#15-email-client-gmail)
16. [Design a Calendar Application (Google Calendar)](#16-calendar-application)
17. [Design a Social Media Feed (Twitter/X)](#17-social-media-feed)
18. [Design a Maps Application Frontend](#18-maps-application-frontend)
19. [Design a Code Editor (CodePen/CodeSandbox)](#19-code-editor)
20. [Design a Comment System (Reddit)](#20-comment-system-reddit)
21. [Design a Shopping Cart + Checkout Flow](#21-shopping-cart--checkout)
22. [Design a Photo Editor (Canva-lite)](#22-photo-editor)
23. [Design a Polling/Voting Widget](#23-pollingvoting-widget)
24. [Design a Toast/Snackbar Notification System](#24-toastsnackbar-system)
25. [Design a Modal/Dialog Manager](#25-modaldialog-manager)
26. [Design a Virtualized List/Table (1M rows)](#26-virtualized-listtable)
27. [Design an Accessibility-First Component](#27-accessibility-first-component)
28. [Design a Micro-Frontend Architecture](#28-micro-frontend-architecture)
29. [Design a PWA Offline-First Application](#29-pwa-offline-first-application)

---
---

## 1. Infinite Scroll Feed

### Q1: Design an infinite scroll feed like LinkedIn or Twitter. Walk through the architecture.

**Answer (Interview-Ready):**

**Requirements:**
- Display a feed of posts (text, images, videos)
- Load more posts as user scrolls down
- Support pull-to-refresh
- Handle 10K+ posts without performance degradation
- Accessible: screen reader announces new content

**Component Architecture:**
```
<App>
  <FeedContainer>          ← data fetching, pagination state
    <VirtualList>          ← renders only visible items
      <FeedCard />         ← memoized, lazy-loads media
      <FeedCard />
      <IntersectionSentinel /> ← triggers next page fetch
    </VirtualList>
    <LoadingSpinner />
    <ErrorBoundary />
  </FeedContainer>
</App>
```

**State Management:**
- **Server state** (TanStack Query): `useInfiniteQuery` with cursor-based pagination
- **Local state**: scroll position, pull-to-refresh animation
- **URL state**: none (feed doesn't need deep linking)
- Cache: keep last 100 posts in memory, evict oldest on new load

**Key Technical Decisions:**
- **IntersectionObserver** for scroll detection (not scroll events — no jank)
- **Virtualization** (react-window / react-virtual): Only render ~20 visible cards + 5 overscan. DOM node count stays under 200 regardless of total posts
- **Cursor-based pagination**: `GET /feed?cursor=abc&limit=20`. Cursor > offset because it handles deletions/inserts between pages
- **Image lazy loading**: `loading="lazy"` + IntersectionObserver for below-fold images
- **Memoization**: `React.memo` on FeedCard with custom comparator (compare by post ID + updated_at)

**Performance:**
- Initial load: <2s LCP. Fetch first 20 posts, render above-fold immediately
- Scroll: 60fps via virtualization. No layout shifts (fixed-height cards or CSS `contain: layout`)
- Memory: Cap at ~100 posts in DOM. GC older posts, re-fetch on scroll-up

**Trade-offs:**
- Virtualization adds complexity but is non-negotiable for feeds with 1000+ items
- Cursor pagination is better for infinite scroll but can't "jump to page 50"
- Keeping scroll position on back-navigation requires caching the entire feed state

**Follow-ups:**
- "How do you handle new posts appearing while scrolling?" → Show a "New posts available" banner at top. Don't auto-inject (causes CLS). On click, prepend and scroll to top
- "How do you handle variable-height cards?" → Use `react-virtual` which supports dynamic measurement. Measure after render, cache heights by post ID
- "How does this work for screen readers?" → Use `aria-live="polite"` region that announces "20 more posts loaded." Each post is an `<article>` with proper headings
- "What about offline?" → Service Worker caches last-fetched feed. Show cached version with "You're offline" banner

🔥 **Most Asked**: Virtualization strategy, IntersectionObserver, cursor vs offset pagination
⚠️ **Common Mistakes**: Using scroll events instead of IntersectionObserver; not virtualizing; using offset pagination
🧠 **Strategy**: Draw the VirtualList → FeedCard → Sentinel pattern. Mention IntersectionObserver by name. Show the TanStack Query `useInfiniteQuery` hook

---

## 2. Autocomplete/Search Component

### Q1: Design an autocomplete search like Google Search or Algolia. Cover both the component and the backend interaction.

**Answer (Interview-Ready):**

**Requirements:**
- Show suggestions as user types (< 200ms perceived latency)
- Support keyboard navigation (arrow keys, enter, escape)
- Handle 50K+ results efficiently
- Accessible: ARIA combobox pattern
- Graceful degradation on slow networks

**Component Architecture:**
```
<SearchContainer>
  <SearchInput           ← controlled input, debounced onChange
    role="combobox"
    aria-expanded
    aria-activedescendant />
  <SuggestionDropdown    ← positioned absolutely, portal for z-index
    role="listbox">
    <SuggestionItem      ← highlighted text matching, keyboard-focusable
      role="option" />
  </SuggestionDropdown>
  <RecentSearches />     ← shown when input focused but empty
</SearchContainer>
```

**Key Technical Decisions:**
- **Debounce** (300ms): Don't fire API on every keystroke. Use trailing debounce with `AbortController` to cancel in-flight requests when user types more
- **Request cancellation**: Each new keystroke aborts the previous fetch. Prevents out-of-order responses (type "rea", get results for "re" arriving after "rea" results)
- **Caching**: Cache results by query prefix. "reac" results likely overlap with "react" results. TanStack Query handles this out-of-the-box
- **Keyboard navigation**: `onKeyDown` handler: ArrowDown/Up = move `activeIndex`, Enter = select, Escape = close
- **Highlight matching text**: Split suggestion text at match position, wrap match in `<mark>`

**Performance:**
- Debounce eliminates 80% of API calls
- AbortController prevents wasted work and race conditions
- Limit suggestions to 8-10 items (no need for 100)
- Virtualize only if suggestion list exceeds ~50 items (rare)

**Accessibility (critical):**
- ARIA combobox pattern: `role="combobox"` on input, `role="listbox"` on dropdown, `role="option"` on items
- `aria-activedescendant` tracks the keyboard-focused option
- `aria-expanded` toggles with dropdown visibility
- Screen reader announces: "5 suggestions available" via `aria-live` region

**Trade-offs:**
- Debounce delay (300ms) vs responsiveness: Too short = too many API calls. Too long = feels laggy. 200-300ms is the sweet spot
- Client-side vs server-side filtering: Small datasets (<1000 items) → filter client-side (instant). Large datasets → server-side with Elasticsearch/Algolia
- Caching aggressiveness: Cache all queries = stale results. Cache with TTL = more API calls but fresher data

**Follow-ups:**
- "How do you handle the 'thundering herd' when cache misses?" → Rate limit API calls per user. Queue requests and batch if possible
- "How would you support fuzzy matching?" → Client-side: Fuse.js library. Server-side: Elasticsearch fuzzy queries or trigram matching
- "How do you handle multi-language search?" → Unicode-aware tokenization. Language-specific analyzers on the server. Client sends Accept-Language header
- "What about search analytics?" → Track: queries, suggestion clicks (position), zero-result queries, time-to-first-interaction

🔥 **Most Asked**: Debounce + AbortController, ARIA combobox, race condition handling
⚠️ **Common Mistakes**: No debounce; no request cancellation; ignoring keyboard navigation; not using ARIA combobox
🧠 **Strategy**: Start with the debounce + AbortController pattern. Then accessibility. These two things separate senior from mid-level answers

---

## 3. Real-Time Collaborative Editor

### Q1: Design a collaborative editor like Google Docs. How do multiple users edit simultaneously?

**Answer (Interview-Ready):**

**Requirements:**
- Multiple users edit the same document in real-time
- See other users' cursors and selections
- No data loss on concurrent edits
- Works with intermittent connectivity
- Undo/redo per user

**Component Architecture:**
```
<EditorApp>
  <Toolbar />                    ← formatting buttons
  <CollaborativeEditor>          ← core contenteditable or ProseMirror
    <CursorOverlay />            ← renders remote cursors with user colors
    <SelectionHighlight />       ← shows other users' selections
  </CollaborativeEditor>
  <PresenceBar />                ← shows active users
  <CommentsSidebar />            ← threaded comments linked to ranges
</EditorApp>
```

**Key Technical Decisions:**

**Conflict Resolution — OT vs CRDT:**
| Approach | Pros | Cons |
|----------|------|------|
| **OT (Operational Transformation)** | Proven (Google Docs uses it), smaller payloads | Needs central server, complex transformation functions |
| **CRDT (Conflict-free Replicated Data Types)** | Peer-to-peer possible, offline-first, simpler merge | Larger metadata, can produce unintuitive results |

→ For FAANG interview: say "I'd use OT with a central server like Google Docs, because it's proven at scale and our architecture is already client-server"

**Real-Time Transport:**
- **WebSocket** for cursor positions + small edits (low latency, bidirectional)
- Operations sent as diffs: `{type: "insert", position: 42, text: "hello", userId: "abc"}`
- Server applies OT, broadcasts transformed operation to all other clients

**State Management:**
- Document state: CRDT/OT document model (not React state — too heavy for re-renders)
- Presence state: Map of `userId → {cursor, selection, color, name}`. Updated via WebSocket
- UI state: toolbar state, sidebar open/closed → local React state

**Performance:**
- Only send diffs, never the full document
- Batch rapid keystrokes (every 50-100ms) to reduce WebSocket messages
- Use `requestAnimationFrame` for cursor overlay rendering
- For large documents (>100 pages): virtualize rendering (only render visible pages)

**Trade-offs:**
- OT requires a central server → single point of failure. CRDT allows P2P but with higher complexity
- Real-time cursors add visual clutter with >10 users. Solution: fade out inactive cursors after 5s
- Rich text (bold, italic, lists) dramatically increases OT complexity vs plain text

**Follow-ups:**
- "How do you handle offline editing?" → Queue operations locally. On reconnect, send queued ops. Server resolves conflicts via OT. This is why Google Docs shows "Trying to connect..."
- "How do you implement undo for a specific user?" → Each user maintains their own undo stack. Undo reverses *their* operations only, not other users'. This is non-trivial with OT — need to transform undo operations against concurrent ops
- "How do you handle 100+ simultaneous editors?" → Unlikely scenario, but: batch presence updates (every 500ms instead of per-keystroke), show only 5 cursors + "and 95 more" badge, use server-side aggregation
- "What library would you use?" → Yjs (CRDT-based), ProseMirror + collaboration plugin, or Slate.js with custom collaboration layer

🔥 **Most Asked**: OT vs CRDT trade-off, WebSocket architecture, conflict resolution
⚠️ **Common Mistakes**: Not mentioning OT/CRDT at all; saying "just use WebSocket" without conflict handling; ignoring offline scenario
🧠 **Strategy**: State the OT vs CRDT trade-off clearly, pick one with justification, then walk through the operation flow: User types → Local apply → Send to server → Server transforms → Broadcast

---

## 4. Chat Application UI

### Q1: Design the frontend for a chat application like Slack or WhatsApp Web.

**Answer (Interview-Ready):**

**Requirements:**
- Channel/conversation list, message list, message composer
- Real-time message delivery (<1s)
- Message history with scroll-up loading
- Typing indicators, read receipts, presence
- File/image sharing, emoji reactions

**Component Architecture:**
```
<ChatApp>
  <Sidebar>
    <ChannelList />          ← virtualized, sorted by recent activity
    <UnreadBadge />
  </Sidebar>
  <ChatArea>
    <ChannelHeader />        ← name, members, actions
    <MessageList>            ← virtualized, inverted scroll
      <MessageBubble />      ← memoized, renders markdown/rich text
      <DateDivider />
      <SystemMessage />
    </MessageList>
    <TypingIndicator />
    <MessageComposer>        ← rich text input, file upload, emoji picker
      <FilePreview />
      <EmojiPicker />        ← lazy loaded (large bundle)
    </MessageComposer>
  </ChatArea>
</ChatApp>
```

**Key Technical Decisions:**
- **WebSocket**: Single persistent connection multiplexed for all channels. Message format: `{type: "message"|"typing"|"presence", channel: "abc", payload: {...}}`
- **Inverted scroll**: MessageList starts at bottom. Scroll up loads older messages. Uses `flexDirection: column-reverse` CSS trick for correct scroll behavior
- **Virtualization**: Essential for channels with 10K+ messages. Only render ~30 messages in DOM. react-virtual with bidirectional scroll
- **Optimistic messages**: On send, immediately show message with "sending..." state. On server ack, update to "sent". On failure, show retry button
- **Message ordering**: Server assigns sequence numbers. Client sorts by sequence, not timestamp (clock skew across devices)

**State Management:**
- **Server state** (TanStack Query or custom): Messages per channel (cached), channel list
- **WebSocket state** (singleton service): Connection status, typing indicators, presence
- **Local state**: Composer text, scroll position, selected emoji, open modals

**Performance:**
- Lazy load EmojiPicker (typically 200KB+ — don't include in initial bundle)
- Debounce typing indicator (send "typing" event every 3s, not every keystroke)
- Image messages: show blurred placeholder (BlurHash) immediately, lazy load full image
- Group consecutive messages from same user (no avatar/name repetition)

**Trade-offs:**
- WebSocket vs SSE: WebSocket is bidirectional (needed for sending), SSE is simpler but only server→client
- Store all messages locally vs fetch on demand: Local = instant switching but memory grows. Fetch = slower switch but bounded memory. Hybrid: cache last 50 messages per channel, fetch more on scroll

**Follow-ups:**
- "How do you handle reconnection?" → Exponential backoff (1s, 2s, 4s, 8s... max 30s). On reconnect, fetch missed messages since last received sequence number. Show "Reconnecting..." banner
- "How do you handle message search?" → Full-text search is server-side (Elasticsearch). Client sends query, server returns matching messages with channel context. Highlight matching text in results
- "How do you handle 1000 channels?" → Virtualize the channel list. Only subscribe to WebSocket events for visible/active channels. Fetch unread counts in batch API
- "How do you handle read receipts at scale?" → Don't send per-message reads. Send "last_read_seq" per channel when user views messages. Server computes unread count: `total_messages - last_read_seq`

🔥 **Most Asked**: WebSocket reconnection, inverted scroll, optimistic messages, virtualization
⚠️ **Common Mistakes**: Not virtualizing message list; polling instead of WebSocket; no optimistic UI; no reconnection strategy
🧠 **Strategy**: Draw the three-column layout. Discuss WebSocket singleton. Mention inverted scroll technique. Talk about optimistic sends

---

## 5. Design System / Component Library

### Q1: Design a design system that will be used by 200+ engineers across 10 product teams.

**Answer (Interview-Ready):**

**Requirements:**
- Consistent UI components (Button, Input, Modal, DataTable, etc.)
- Theming support (light/dark, white-labeling)
- Accessible by default (WCAG AA)
- Tree-shakeable (only ship what you use)
- Versioned with backward compatibility

**Architecture:**
```
design-system/
├── packages/
│   ├── core/            ← tokens (colors, spacing, typography)
│   ├── react/           ← React components
│   ├── angular/         ← Angular components (if needed)
│   ├── icons/           ← SVG icon library
│   └── themes/          ← theme files
├── docs/                ← Storybook + documentation site
├── tooling/
│   ├── eslint-plugin/   ← linting rules for correct usage
│   └── codemods/        ← migration scripts for breaking changes
```

**Key Technical Decisions:**
- **Monorepo** (Turborepo/Nx): All packages in one repo. Atomic commits across components + docs
- **Headless + styled approach**: Build headless logic (Radix UI pattern) + styled layer on top. Teams can use headless only if they need custom styling
- **CSS approach**: CSS Modules or vanilla-extract for zero-runtime. Avoid CSS-in-JS runtime cost at scale
- **Versioning**: Semantic versioning with changesets. Breaking changes = major version. Codemods provided for migration
- **Storybook**: Every component has stories showing all variants, states, and accessibility info

**Theming Architecture:**
```typescript
// Theme tokens as CSS custom properties
:root {
  --ds-color-primary: #0066cc;
  --ds-spacing-md: 16px;
  --ds-font-body: 'Inter', sans-serif;
}
[data-theme="dark"] {
  --ds-color-primary: #4da6ff;
}
```
- CSS custom properties for runtime theming (no JS required)
- Design tokens exported as CSS, SCSS, JS, and JSON

**Trade-offs:**
- Headless components: maximum flexibility but teams must write their own styles (slower adoption). Styled components: instant adoption but less flexibility. Recommendation: ship both
- Single package vs multiple: Single is simpler to install. Multiple allows tree-shaking at package level. Choose multiple for large design systems
- Build for React-only vs framework-agnostic (Web Components): Web Components work everywhere but have DX limitations. React-specific is better DX but locks you in

**Follow-ups:**
- "How do you handle breaking changes?" → Never break without a major version. Provide codemods. Deprecate in minor version, remove in next major. Give teams 3 months to migrate
- "How do you enforce adoption?" → ESLint plugin that warns on raw `<button>` when `<DSButton>` exists. Show adoption metrics dashboard. Make the design system *easier* to use than custom code
- "How do you test a design system?" → (1) Unit tests for logic, (2) Visual regression with Chromatic/Percy, (3) Accessibility tests with axe-core, (4) Integration tests with consumer apps
- "How do you handle component performance?" → Tree-shaking: named exports only. Bundle analysis per release. Performance benchmarks in CI for complex components (DataTable, Calendar)

🔥 **Most Asked**: Theming with CSS custom properties, monorepo structure, versioning strategy
⚠️ **Common Mistakes**: Not considering multi-framework support; ignoring versioning; no migration path for breaking changes
🧠 **Strategy**: Talk about the organizational challenge as much as the technical one. Design systems are as much about adoption as about code

---

## 6. Dashboard with Real-Time Charts

### Q1: Design a live dashboard showing real-time metrics with multiple charts (Cisco/Datadog-style).

**Answer (Interview-Ready):**

**Requirements:**
- Multiple chart types (line, bar, pie, heatmap)
- Real-time updates (1-5 second intervals)
- Configurable time ranges (5 min, 1 hour, 24 hour, custom)
- 20+ charts on a single page without performance degradation
- Data export (CSV, PNG)

**Component Architecture:**
```
<DashboardApp>
  <DashboardHeader>
    <TimeRangePicker />
    <RefreshToggle />        ← auto-refresh on/off
    <ExportButton />
  </DashboardHeader>
  <DashboardGrid>            ← CSS Grid / react-grid-layout for drag-resize
    <ChartWidget>            ← wrapper: handles loading, error, resize
      <Chart />              ← actual chart (D3/ECharts/Recharts)
    </ChartWidget>
    × 20-30 widgets
  </DashboardGrid>
</DashboardApp>
```

**Key Technical Decisions:**
- **Chart library**: ECharts or D3 for complex visualizations. Recharts for simpler cases. ECharts handles 10K+ data points with canvas rendering
- **Real-time transport**: SSE (Server-Sent Events) preferred over WebSocket — it's unidirectional (server→client only), auto-reconnects, lighter protocol. WebSocket only if bidirectional needed
- **Canvas vs SVG**: Canvas for charts with >500 data points (better performance). SVG for interactive charts with few data points (easier event handling, accessibility)
- **Data windowing**: For a 24-hour chart at 1-second resolution = 86,400 points. Downsample on server: send 5-min aggregates for 24h view, raw data for 5-min view
- **Layout**: `react-grid-layout` for draggable/resizable widgets. Persist layout to user preferences

**Performance (Critical for 20+ charts):**
- **Virtualize off-screen charts**: Only render charts in viewport. Use IntersectionObserver
- **Throttle updates**: Don't re-render chart on every data point. Batch updates every 1-2 seconds
- **Web Workers**: Process data aggregation (averages, percentiles) in a worker to avoid blocking the main thread
- **Canvas rendering**: For high-frequency data, use canvas (ECharts). SVG with 10K DOM nodes will choke
- **Memoize**: Each ChartWidget wrapped in `React.memo`. Only re-render when its specific data changes

**State Management:**
- **Server state**: Metrics data per chart, fetched with polling or SSE
- **Local state**: Time range, layout configuration, expanded/collapsed state
- **Shared state**: Global time range selection applies to all charts (React Context or Zustand)

**Trade-offs:**
- SSE vs WebSocket: SSE is simpler, auto-reconnects, works through proxies. WebSocket is lower latency but needs reconnection logic. Choose SSE unless you need sub-second updates
- Canvas vs SVG: Canvas is faster but not accessible (no DOM). SVG is accessible but slower with many elements. For dashboards: canvas + aria-label on the widget wrapper
- Client-side aggregation vs server-side: Server = less bandwidth. Client = more flexibility for zooming/panning

**Follow-ups:**
- "How do you handle a chart with 1M data points?" → Server-side downsampling (LTTB algorithm). Send ~2000 points max to the client. As user zooms in, fetch higher resolution data for the visible range
- "How do you handle dashboard export to PDF?" → Use html2canvas for screenshots or server-side rendering with Puppeteer for pixel-perfect PDFs
- "What about accessibility for charts?" → Each chart has: (1) `aria-label` describing the trend, (2) a data table alternative toggled by button, (3) keyboard navigation for data points
- "How do you handle stale data?" → Show "Last updated: 5s ago" on each widget. If >30s stale, show warning icon. If SSE connection drops, show "Reconnecting..." with backoff

🔥 **Most Asked**: Canvas vs SVG, real-time update strategy, performance with 20+ charts
⚠️ **Common Mistakes**: Using SVG for high-data charts; not throttling updates; re-rendering all charts when one changes
🧠 **Strategy**: Emphasize the performance architecture. Dashboards are performance problems disguised as UI problems

---

## 7. Image Gallery / Carousel

### Q1: Design a responsive image gallery with carousel, lazy loading, and zoom.

**Answer (Interview-Ready):**

**Requirements:**
- Grid view with thumbnails, click to expand
- Carousel with prev/next navigation
- Lazy load off-screen images
- Pinch-to-zoom on mobile, click-to-zoom on desktop
- Keyboard accessible, touch-friendly

**Component Architecture:**
```
<Gallery>
  <ImageGrid>                  ← masonry or CSS Grid layout
    <LazyImage />              ← IntersectionObserver + loading="lazy"
  </ImageGrid>
  <LightboxModal>              ← Portal, trap focus
    <CarouselTrack>            ← CSS transform for sliding
      <FullImage />            ← progressive loading: blur → full
    </CarouselTrack>
    <ZoomLayer />              ← transforms on pinch/click
    <NavigationControls />     ← prev/next, thumbnails strip
  </LightboxModal>
</Gallery>
```

**Key Technical Decisions:**
- **Layout**: CSS Grid with `grid-auto-rows: masonry` (where supported) or a JS-based masonry layout (columns calculated by container width)
- **Lazy loading**: Native `loading="lazy"` + IntersectionObserver for preloading next 3-5 images off-screen
- **Progressive loading**: Show BlurHash/LQIP (Low Quality Image Placeholder) immediately, swap to full image on load
- **Carousel animation**: CSS `transform: translateX()` with `transition`. Touch: track finger position with `touchstart/move/end`. Snap to nearest image on release
- **Zoom**: CSS `transform: scale()` + `transform-origin` at click/pinch point. Cap at 3x zoom. Pan with drag while zoomed

**Performance:**
- **Responsive images**: `<img srcset="small.webp 400w, medium.webp 800w, large.webp 1600w" sizes="(max-width: 768px) 100vw, 33vw">`
- **WebP/AVIF**: 30-50% smaller than JPEG. Provide fallback with `<picture>` element
- **Preload adjacent images**: When carousel is open, preload prev+next images for instant swipe

**Trade-offs:**
- Masonry vs simple grid: Masonry is visually appealing but complex to implement and can cause CLS. Simple grid is easier and more predictable
- Client-side image processing vs server-side: Thumbnails should be server-generated (correct sizes). Don't resize in the browser

**Follow-ups:**
- "How do you handle 10K images?" → Virtualize the grid. Load in batches of 50. Infinite scroll with pagination
- "How do you handle different aspect ratios?" → Masonry layout or `object-fit: cover` with consistent container sizes
- "Mobile gestures?" → Use `touch-action: pan-y pinch-zoom` CSS. Track touch events for custom swipe detection with velocity-based momentum

🔥 **Most Asked**: Lazy loading strategy, responsive images, carousel touch handling
⚠️ **Common Mistakes**: Loading all images upfront; not using responsive images; poor zoom UX on mobile
🧠 **Strategy**: Start with the progressive loading pipeline: blur placeholder → thumbnail → full image. This shows performance thinking

---

## 8. Form Builder

### Q1: Design a dynamic form builder where users create custom forms (Typeform/Google Forms style).

**Answer (Interview-Ready):**

**Requirements:**
- Drag-and-drop form building interface
- Field types: text, select, checkbox, radio, date, file upload, rating
- Conditional logic (show field B if field A = "yes")
- Preview mode and published form URL
- Form submission with validation

**Component Architecture:**
```
<FormBuilder>
  <FieldPalette />           ← draggable field types
  <FormCanvas>               ← drop zone, renders field previews
    <FieldWrapper>           ← drag handle, delete, config button
      <FieldRenderer />      ← renders appropriate input type
    </FieldWrapper>
  </FormCanvas>
  <FieldConfigPanel />       ← right sidebar: label, required, conditions
  <PreviewPane />            ← rendered form as user would see it
</FormBuilder>
```

**Data Model (Key):**
```typescript
interface FormSchema {
  id: string;
  title: string;
  fields: FormField[];
}
interface FormField {
  id: string;
  type: 'text' | 'select' | 'checkbox' | 'date' | ...;
  label: string;
  required: boolean;
  options?: string[];         // for select/radio/checkbox
  conditions?: Condition[];   // show/hide logic
  validation?: ValidationRule[];
}
interface Condition {
  dependsOn: string;          // field ID
  operator: 'equals' | 'contains' | 'gt' | ...;
  value: any;
  action: 'show' | 'hide';
}
```

**Key Technical Decisions:**
- **Schema-driven rendering**: The form is a JSON schema. Both builder and preview consume the same schema. Builder modifies it, preview renders it
- **Drag-and-drop**: Use `@dnd-kit` (React) or native HTML5 drag API. `@dnd-kit` is more accessible and customizable
- **Conditional logic engine**: Evaluate conditions on field change. Topological sort to handle chained conditions (A shows B, B shows C). Detect cycles
- **Validation**: JSON-schema-based validation (AJV) or custom. Runs client-side on submit + server-side for security
- **Undo/redo**: Store schema snapshots in a history stack. Every action (add field, reorder, edit config) creates a new snapshot. Limit to 50 entries

**Trade-offs:**
- JSON schema is flexible but can become complex. Alternative: simpler config object with less power
- Client-side validation gives instant feedback but must be duplicated on server for security
- Rich drag-and-drop with animations = bigger bundle. Simple reordering with buttons = smaller, more accessible

**Follow-ups:**
- "How do you handle form submission for 10K respondents?" → Queue submissions. Idempotency key to prevent duplicates. Rate limit per IP
- "How do you add custom field types?" → Plugin architecture: register new field types with a renderer component and a config component
- "What about form analytics?" → Track: completion rate, drop-off per field, average time per field, validation error rates per field

🔥 **Most Asked**: Schema-driven rendering, conditional logic, drag-and-drop implementation
⚠️ **Common Mistakes**: Hardcoding field types instead of schema-driven; no undo/redo; ignoring condition cycles
🧠 **Strategy**: Lead with the data model (FormSchema). The data model IS the design. Everything else renders from it

---

## 9. Drag-and-Drop Kanban Board

### Q1: Design a Kanban board like Trello with drag-and-drop cards across columns.

**Answer (Interview-Ready):**

**Requirements:**
- Multiple columns (To Do, In Progress, Done, custom)
- Drag cards within and across columns
- Real-time updates when teammates move cards
- Keyboard accessible drag-and-drop
- Mobile touch support

**Component Architecture:**
```
<KanbanBoard>
  <DndContext>                   ← @dnd-kit context
    <SortableContext>            ← per-column sortable
      <Column>
        <ColumnHeader />        ← title, card count, add button
        <CardList>              ← droppable area
          <SortableCard />      ← draggable card
        </CardList>
      </Column>
    </SortableContext>
  </DndContext>
</KanbanBoard>
```

**Key Technical Decisions:**
- **@dnd-kit** over react-beautiful-dnd: Better maintained, keyboard accessible out-of-box, supports touch, smaller bundle
- **Optimistic reorder**: On drop, immediately reorder in local state. Send PATCH to server. On failure, revert
- **Real-time sync**: WebSocket broadcasts card moves. Other users see the card animate to its new position
- **Collision detection**: When dragging across columns, use "closest center" algorithm to determine which column the card belongs to
- **Drag overlay**: Render a "ghost" card that follows the cursor using a portal (prevents layout shifts)

**State Management:**
```typescript
// Normalized state
{
  columns: { id: Column }
  cards: { id: Card }
  columnOrder: string[]       // column IDs in order
  cardsByColumn: { columnId: string[] }  // card IDs per column
}
```
Normalized for O(1) lookups and easy reordering

**Performance:**
- Virtualize columns with many cards (>50)
- Only re-render the source and destination columns during drag, not the entire board
- Use `will-change: transform` on the dragged item for GPU-accelerated movement

**Trade-offs:**
- Optimistic updates risk conflicts (two users move the same card). Server resolves with "last write wins" or shows a conflict dialog
- Full real-time sync vs polling: Real-time is better UX but increases server complexity. For low-traffic boards, polling every 5s is acceptable

**Follow-ups:**
- "How do you handle drag on mobile?" → Touch events: `touchstart`, `touchmove`, `touchend`. Long press to activate drag (400ms) to distinguish from scrolling. `@dnd-kit` handles this automatically
- "How do you persist card order?" → Store `position` as a float or use fractional indexing (between 1.0 and 2.0, insert at 1.5). Avoids rewriting all positions on every reorder
- "How do you implement keyboard drag?" → Space to pick up card, arrow keys to move between columns/positions, Space to drop. Announce position with aria-live

🔥 **Most Asked**: Optimistic reorder with rollback, fractional indexing, keyboard DnD
⚠️ **Common Mistakes**: Using HTML5 drag API (poor mobile/a11y support); not normalizing state; no conflict resolution
🧠 **Strategy**: Show the normalized state shape first. It determines the entire DnD logic

---

## 10. Video Player

### Q1: Design a custom video player with adaptive streaming, captions, and quality selection.

**Answer (Interview-Ready):**

**Requirements:**
- Play/pause, seek bar, volume, fullscreen, playback speed
- Adaptive bitrate streaming (quality adjusts to network)
- Closed captions (multiple languages)
- Keyboard shortcuts (Space, F, M, arrow keys)
- Picture-in-picture support

**Component Architecture:**
```
<VideoPlayer>
  <VideoElement />              ← native <video> with HLS.js
  <OverlayControls>
    <PlayPauseButton />
    <ProgressBar />             ← buffered + played indicators
    <VolumeControl />
    <CaptionSelector />
    <QualitySelector />
    <SpeedSelector />
    <FullscreenButton />
    <PIPButton />
  </OverlayControls>
  <CaptionOverlay />            ← positioned subtitles with styling
  <BufferingSpinner />
  <ThumbnailPreview />          ← on hover over progress bar
</VideoPlayer>
```

**Key Technical Decisions:**
- **HLS.js** (or Dash.js): Handles adaptive bitrate streaming. Automatically switches quality based on bandwidth/buffer. The `<video>` element only understands MP4 natively; HLS.js enables M3U8/HLS playback
- **Custom controls**: Hide native controls (`controls={false}`). Build custom UI for consistency and features. Use the HTMLMediaElement API: `play()`, `pause()`, `currentTime`, `duration`, `volume`, events
- **Captions**: VTT format. Parse with the native TextTrack API. Custom rendering for styling control (position, font, background)
- **Progress bar**: Two layers — buffer indicator (gray) + played indicator (colored). On hover, show thumbnail from sprite sheet (pregenerated on server)
- **Keyboard shortcuts**: Capture at player level, not global. Space = play/pause, F = fullscreen, M = mute, ← = -5s, → = +5s

**Performance:**
- **Poster image**: Show before video loads (blur placeholder → actual poster)
- **Lazy load video**: Don't download video until user clicks play (unless autoplay)
- **Preload strategy**: `preload="metadata"` (load duration + dimensions, not video data)

**Trade-offs:**
- Custom controls: Full design flexibility but must handle all edge cases (fullscreen API differences across browsers, mobile Safari quirks)
- HLS vs DASH: HLS has wider browser support (with HLS.js). DASH is more standards-based. Choose HLS for broad compatibility

**Follow-ups:**
- "How does adaptive bitrate work?" → HLS sends a master playlist with quality levels. Player monitors download speed and buffer. If buffer drops, switches to lower quality. If bandwidth is high, upgrades quality. This happens per-segment (2-10s chunks)
- "How do you handle subtitles for accessibility?" → VTT files. Allow font size, color, background customization. Comply with FCC requirements for video platforms. Test with screen readers

🔥 **Most Asked**: HLS.js integration, custom controls via HTMLMediaElement API, adaptive bitrate
⚠️ **Common Mistakes**: Using native controls only; not handling HLS; no keyboard shortcuts; no loading/buffering states
🧠 **Strategy**: Explain the video streaming pipeline: CDN → M3U8 manifest → HLS.js → quality switching → <video> element

---

## 11. Notification Center

### Q1: Design a notification center like GitHub's or Slack's notification bell.

**Answer (Interview-Ready):**

**Requirements:**
- Bell icon with unread count badge
- Dropdown with notification list (grouped by type)
- Mark as read (individual + all)
- Real-time new notification arrival
- Push notifications (browser Notification API)

**Component Architecture:**
```
<NotificationCenter>
  <NotificationBell>            ← badge with unread count
    <NotificationDropdown>      ← portal, positioned
      <NotificationTabs />      ← All | Unread | Mentions
      <NotificationList>        ← virtualized if >50
        <NotificationItem />    ← icon, text, timestamp, read/unread
      </NotificationList>
      <MarkAllReadButton />
    </NotificationDropdown>
  </NotificationBell>
</NotificationCenter>
```

**Key Technical Decisions:**
- **Real-time delivery**: SSE connection for new notifications. On receive, update cache + increment badge
- **Unread count**: Two approaches: (1) Server sends count via SSE (simple), (2) Client counts from local cache (faster but can drift). Recommendation: server-authoritative count, sync every 30s
- **Mark as read**: Optimistic UI — mark locally first, then API call. Batch "mark all read" into single API call
- **Notification queuing**: If 10 notifications arrive in 5 seconds, don't show 10 toasts. Group into "You have 10 new notifications" or show only the latest
- **Push notifications**: Request permission on explicit user action (not on page load). Use the Push API + Service Worker for background notifications

**State Management:**
- Server state (TanStack Query): Notification list with `staleTime: 30s`
- Local state: Dropdown open/close, active tab
- SSE integration: On new notification event, use `queryClient.setQueryData` to prepend to cache

**Trade-offs:**
- Eager fetching (fetch all on open) vs pagination: Fetch first 20 on open, paginate on scroll. Don't preload all notifications — most users just check the count
- Push notifications: Better engagement but users can block them. Always have in-app notifications as fallback

**Follow-ups:**
- "How do you handle notification routing?" → Each notification has an `actionUrl`. On click, navigate to that URL and mark as read. For in-app navigation, use `router.push` instead of full page reload
- "How do you avoid notification fatigue?" → User preferences: per-channel mute, daily digest option, priority levels. Server-side: aggregate similar notifications ("3 people liked your post" instead of 3 separate notifications)

🔥 **Most Asked**: Real-time delivery mechanism, unread count sync, notification grouping
⚠️ **Common Mistakes**: Polling instead of SSE; showing every notification as a separate toast; no grouping strategy
🧠 **Strategy**: Focus on the data flow: Server event → SSE → Cache update → Badge update → List update. Then discuss grouping

---

## 12. Multi-Step Wizard

### Q1: Design a multi-step form/wizard like an onboarding flow or checkout process.

**Answer (Interview-Ready):**

**Requirements:**
- 4-7 steps with progress indicator
- Forward/backward navigation
- Per-step validation (can't advance without valid data)
- Persist progress (survive page refresh)
- Different paths based on previous answers (branching)

**Component Architecture:**
```
<WizardContainer>
  <ProgressBar steps={steps} currentStep={step} />
  <StepRenderer>
    {step === 1 && <PersonalInfo />}
    {step === 2 && <Preferences />}
    {step === 3 && <Review />}
    {step === 4 && <Confirmation />}
  </StepRenderer>
  <WizardNavigation>
    <BackButton />
    <NextButton />          ← disabled until step validates
  </WizardNavigation>
</WizardContainer>
```

**Key Technical Decisions:**
- **State machine** (XState recommended): Model wizard as a state machine with states (step1, step2, ..., complete) and transitions (NEXT, BACK, SUBMIT). This handles branching logic cleanly and prevents impossible states
- **Form library**: React Hook Form with Zod schemas. Each step has its own schema. Validate on "Next" click
- **Persistence**: Save to `sessionStorage` on every step transition. Restore on page load. Clear on completion
- **URL sync**: Each step has its own URL (`/onboarding/step-2`). Enables browser back/forward. Deep linking to specific steps (if allowed)
- **Branching**: State machine transitions can be conditional: `on: { NEXT: [ { target: 'step3a', cond: 'isPremium' }, { target: 'step3b' } ] }`

**Performance:**
- Lazy load later steps (user is on step 1, don't load step 4's component)
- Prefetch next step while user fills current step
- Keep previous step data in memory (instant back navigation)

**Trade-offs:**
- State machine: Powerful but adds XState dependency. Simple wizards (no branching) can use `useState(stepNumber)`
- URL per step vs single URL: URL per step enables bookmarking/sharing but exposes internal structure. Single URL is simpler
- Server validation per step vs only on final submit: Per-step catches errors early but requires more API calls

**Follow-ups:**
- "How do you handle the user pressing browser back?" → If using URL-synced steps, browser back = wizard back. If not, use `beforeunload` event to warn about unsaved data
- "How do you handle error recovery?" → Save completed steps to server. On revisit, skip completed steps. Show "Resume where you left off?" prompt

🔥 **Most Asked**: State machine for wizard logic, per-step validation, persistence strategy
⚠️ **Common Mistakes**: Using a switch statement instead of state machine for complex wizards; no persistence; no back navigation support
🧠 **Strategy**: Draw the state machine diagram first. States = steps, transitions = NEXT/BACK. This impresses interviewers

---

## 13. Spreadsheet (Google Sheets)

### Q1: Design a browser-based spreadsheet application like Google Sheets.

**Answer (Interview-Ready):**

**Requirements:**
- Grid of cells (rows A-Z, columns 1-1000+)
- Cell editing with formulas (=SUM(A1:A10))
- Cell formatting (bold, colors, borders)
- Collaborative editing (multiple users)
- Undo/redo, copy/paste

**Component Architecture:**
```
<SpreadsheetApp>
  <Toolbar />                    ← formatting, functions
  <FormulaBar />                 ← shows/edits current cell formula
  <SheetContainer>
    <ColumnHeaders />            ← A, B, C... (sticky top)
    <RowNumbers />               ← 1, 2, 3... (sticky left)
    <VirtualGrid>                ← renders only visible cells
      <Cell />                   ← lightweight, reads from data model
    </VirtualGrid>
  </SheetContainer>
  <SheetTabs />                  ← multiple sheets
</SpreadsheetApp>
```

**Key Technical Decisions:**
- **Virtualization is mandatory**: A 1000×1000 grid = 1M cells. Only render ~200 visible cells. Use `react-virtual` 2D virtualizer or custom Canvas rendering
- **Data model**: Sparse representation — only store cells that have content
  ```typescript
  type CellData = { value: string; formula?: string; format?: CellFormat }
  type SheetData = Map<string, CellData>  // "A1" → CellData
  ```
- **Formula engine**: Parse formulas into AST. Build dependency graph (A1 depends on B1, B1 depends on C1). Topological sort for evaluation order. Detect circular references
- **Canvas vs DOM rendering**: Canvas for the grid (1M cells impossible with DOM). DOM for the actively edited cell (need text input). This hybrid is what Google Sheets actually does
- **Collaboration**: Same OT/CRDT approach as collaborative editor, but operations are cell-level: `{type: "setCellValue", cell: "A1", value: "42"}`

**Performance:**
- Canvas rendering: Draw only visible cells. Redraw on scroll using `requestAnimationFrame`
- Memoize formula results. Only recalculate when dependencies change
- Batch rendering: When pasting 1000 cells, don't render each one — batch into single canvas redraw
- Web Worker for formula evaluation (complex SUM/VLOOKUP across 10K cells shouldn't block UI)

**Trade-offs:**
- Canvas rendering: Extremely performant but no DOM accessibility. Must implement custom keyboard navigation and screen reader support
- Sparse vs dense data model: Sparse saves memory (90% of cells are empty) but lookups need hash map. Dense wastes memory but is simpler
- Client-side formula evaluation: Instant but limited to browser capabilities. Server-side: more powerful but adds latency

**Follow-ups:**
- "How do you handle circular references?" → During dependency graph construction, run cycle detection (DFS with visited set). Show #REF! error in cells that form a cycle
- "How do you handle copy-paste of 10K cells?" → Parse clipboard data (tab-separated values). Batch insert into data model. Single canvas redraw. Use `requestIdleCallback` if needed
- "How do you implement conditional formatting?" → Rules stored per sheet: `{range: "A1:A100", condition: "greaterThan", value: 50, format: {background: "green"}}`. Evaluate during render

🔥 **Most Asked**: Virtualization strategy, formula dependency graph, Canvas vs DOM, collaboration
⚠️ **Common Mistakes**: Trying to render a million DOM elements; not using Canvas; no formula dependency tracking
🧠 **Strategy**: Start with "1M cells means we can't use DOM for the grid — we need Canvas." This immediately shows you understand the core challenge

---

## 14. File Explorer

### Q1: Design a file explorer like VS Code's sidebar or Dropbox's file browser.

**Answer (Interview-Ready):**

**Requirements:**
- Tree view with folders and files
- Expand/collapse folders
- Context menu (rename, delete, move, new file/folder)
- Drag-and-drop for moving files
- Search/filter within the tree
- Keyboard navigation (arrow keys, Enter, Delete)

**Component Architecture:**
```
<FileExplorer>
  <SearchBar />                ← filter tree in real-time
  <TreeView>                   ← recursive or flat+indent
    <TreeNode>                 ← folder or file, indented by depth
      <ExpandIcon />
      <FileIcon />             ← icon by file type
      <FileName />             ← editable on rename
    </TreeNode>
  </TreeView>
  <ContextMenu />              ← portal, positioned at right-click
</FileExplorer>
```

**Key Technical Decisions:**
- **Flat list vs recursive components**: Flat list with depth property is better for virtualization. Store tree as flat array sorted by DFS order with `depth` and `parentId` fields. Expand/collapse = filter by visibility
- **Virtualization**: Essential for large trees (10K+ files). Only render visible nodes. Expanding a folder with 500 items shouldn't freeze the UI
- **Lazy loading folders**: Don't fetch children until folder is expanded. API: `GET /folders/{id}/children`
- **Optimistic operations**: Rename, move, new file — show immediately, revert on API failure

**State:**
```typescript
type TreeNode = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  depth: number;
  isExpanded: boolean;     // for folders
  isLoading: boolean;      // loading children
}
// Stored as Map<id, TreeNode> for O(1) lookup
// Ordered array of visible node IDs for rendering
```

**Accessibility:**
- ARIA tree pattern: `role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-level`
- Arrow keys: Up/Down = navigate, Right = expand, Left = collapse, Enter = open/select

**Trade-offs:**
- Flat list + virtualization vs nested components: Flat is performant but harder to implement DnD across depths. Nested is natural but can't virtualize easily
- Fetch all children eagerly vs lazy: Eager is faster navigation but wastes bandwidth. Lazy is efficient but adds loading states on every expand

**Follow-ups:**
- "How do you handle 100K files?" → Must virtualize. Use flat list representation. Lazy load children. Add search as the primary navigation method instead of scrolling
- "How do you implement drag-and-drop file moving?" → Drag a TreeNode, drop onto a folder. Validate (can't drop folder into itself). Optimistic move in state, API PATCH to update parentId

🔥 **Most Asked**: Flat tree representation for virtualization, lazy loading, ARIA tree pattern
⚠️ **Common Mistakes**: Recursive components (can't virtualize); loading entire tree upfront; no keyboard navigation
🧠 **Strategy**: Show the flat data structure first. Everything follows from it

---

## 15. Email Client (Gmail)

### Q1: Design the frontend for an email client like Gmail.

**Answer (Interview-Ready):**

**Requirements:**
- Inbox with email list (sender, subject, preview, date)
- Email detail view with conversation threading
- Compose with rich text, attachments, CC/BCC
- Labels, search, starred, spam filtering
- Keyboard shortcuts (j/k navigate, e archive, r reply)

**Component Architecture:**
```
<EmailApp>
  <Sidebar>                      ← labels, folders, compose button
    <LabelList />
    <ComposeButton />
  </Sidebar>
  <MainArea>
    <EmailToolbar />             ← search, actions (archive, delete, label)
    <EmailList>                  ← virtualized, selectable
      <EmailRow />               ← checkbox, star, sender, subject, date
    </EmailList>
    <EmailDetail>                ← conversation thread view
      <EmailMessage />           ← expandable per message
      <ReplyComposer />
    </EmailDetail>
  </MainArea>
  <ComposeModal />               ← floating compose window
</EmailApp>
```

**Key Technical Decisions:**
- **Layout**: Three-panel layout with resizable panes. Sidebar (fixed), email list (scrollable, virtualized), detail (scrollable)
- **Threading**: Group emails by conversation ID. Display as expandable accordion. Most recent expanded, older collapsed
- **Rich text compose**: Use Tiptap or Slate.js for the rich text editor. Support inline images, formatting, links
- **Optimistic actions**: Archive, delete, label → immediately update UI, undo bar shows for 5 seconds, API call in background. If undo clicked, cancel API. If not, proceed
- **Keyboard shortcuts**: Global shortcut handler. `j/k` = up/down in list, `o/Enter` = open, `e` = archive, `#` = delete, `r` = reply, `c` = compose

**Performance:**
- **Prefetch**: When user hovers over an email for 200ms, prefetch the detail view
- **Email list virtualization**: Only render visible rows (~20-30)
- **HTML email sanitization**: Emails contain arbitrary HTML. Sanitize with DOMPurify to prevent XSS. Render in sandboxed iframe if needed
- **Attachment preview**: Generate thumbnails server-side. Don't download full attachments until clicked

**Trade-offs:**
- Iframe vs inline for email bodies: Iframe isolates styles/scripts (safer) but heavier. Inline with sanitization is lighter but risks CSS leaking. Gmail uses iframe
- Single-page vs split: Gmail uses a SPA with hash-based routing. Trade-off: SPA = faster navigation, but initial load is heavier

**Follow-ups:**
- "How does Gmail search work on the frontend?" → Client sends query to server. Server returns matching email IDs with highlighted snippets. Client renders results in the same list view format. For instant search, prefetch search index for recent emails
- "How do you handle offline email?" → Service Worker caches last-fetched inbox and opened emails. Compose works offline, queues send for when online. IndexedDB for email body storage
- "How do you handle 50K emails in inbox?" → Pagination on server, virtualization on client. Only fetch first page (50 emails). Search and filter replace scrolling for large mailboxes

🔥 **Most Asked**: Threading, keyboard shortcuts, HTML email security, optimistic undo
⚠️ **Common Mistakes**: Not sanitizing email HTML (XSS!); loading all emails at once; no keyboard shortcut support
🧠 **Strategy**: Lead with the security concern (HTML email XSS) — shows senior thinking. Then cover the three-panel layout architecture

---

## 16. Calendar Application

### Q1: Design a calendar application like Google Calendar.

**Answer (Interview-Ready):**

**Requirements:**
- Day, week, month views
- Create/edit/delete events with time slots
- Drag to create events, drag to reschedule
- Recurring events
- Multiple calendars with color coding
- Timezone support

**Component Architecture:**
```
<CalendarApp>
  <CalendarHeader>
    <ViewSwitcher />           ← Day | Week | Month
    <DateNavigator />          ← Prev | Today | Next
    <TimezoneSelector />
  </CalendarHeader>
  <CalendarGrid>
    <TimeColumn />             ← hours along the left (for day/week)
    <DayColumn>                ← one per visible day
      <EventBlock />           ← positioned absolutely by time
      <OverlapHandler />       ← side-by-side overlapping events
    </DayColumn>
  </CalendarGrid>
  <EventModal />               ← create/edit form
  <MiniCalendar />             ← sidebar date picker
</CalendarApp>
```

**Key Technical Decisions:**
- **Event positioning**: Convert event times to pixel positions. Day starts at 0px, hours = 60px each. Event at 10:00-11:30 → top: 600px, height: 90px
- **Overlap handling**: Find overlapping events (events that share time ranges). Divide available width equally. Algorithm: sort by start time, use a "column assignment" greedy algorithm
- **Drag interactions**: Create = mousedown on empty slot → drag to set duration. Move = mousedown on event → drag to new time. Resize = drag event bottom edge. All using `mousedown/move/up` with 15-min snapping
- **Recurring events**: Store rule (RFC 5545 RRULE): `{frequency: 'weekly', interval: 1, days: ['MO', 'WE', 'FR'], until: '2026-12-31'}`. Expand recurrences on the client for the visible date range only
- **Timezone**: Store all events in UTC. Convert to user's timezone for display. When creating events, store the original timezone so cross-timezone users see correct local time

**Performance:**
- Only fetch events for the visible date range (+1 week buffer)
- Month view: fetch all events for the month in one API call
- Cache fetched events by date range. Moving between weeks checks cache first
- Virtual rendering: For a day with 100 events, only render those in the visible scroll area

**Trade-offs:**
- Client-side recurrence expansion: instant but complex RRULE parsing. Server-side: simpler client but more API calls. Recommendation: server expands recurring events within requested date range
- Pixel-perfect positioning vs CSS Grid: Absolute positioning is more flexible for overlaps. CSS Grid is cleaner but struggles with variable-height overlapping events

**Follow-ups:**
- "How do you handle all-day events?" → Separate "all-day" row above the time grid. All-day events span the full column width. Multi-day all-day events span across day columns
- "How do you handle timezone changes?" → User changes timezone → re-render all events with new UTC offset. Events with absolute times (UTC) don't change; relative references ("every Monday at 9am") recalculate
- "How do you handle real-time updates?" → WebSocket/SSE for calendar changes by other users. Optimistic local updates. Server authoritative for conflicts (two people book same slot)

🔥 **Most Asked**: Event overlap algorithm, drag-to-create, timezone handling, recurring events
⚠️ **Common Mistakes**: Not handling overlapping events; ignoring timezones; trying to render thousands of events without virtualization
🧠 **Strategy**: The overlap algorithm is the most interesting part. Draw it: two events overlap → divide width → assign columns. This is the "deep dive" topic

---

## 17. Social Media Feed (Twitter/X)

### Q1: Design the frontend for a Twitter/X-like social media feed.

**Answer (Interview-Ready):**

**Requirements:**
- Timeline feed with tweets (text, images, videos, links)
- Compose tweet, like, retweet, reply
- Real-time: new tweets appear, live like counts
- Responsive (mobile-first)
- Infinite scroll with pull-to-refresh

**Component Architecture:**
```
<FeedApp>
  <ComposeBox />                 ← rich text, media upload, character count
  <FeedTimeline>
    <VirtualList>
      <TweetCard>                ← main tweet display
        <UserAvatar />
        <TweetContent />         ← text with @mentions, #hashtags, links parsed
        <MediaGallery />         ← 1-4 images grid, video player
        <EngagementBar />        ← like, retweet, reply, share counts + buttons
      </TweetCard>
    </VirtualList>
    <NewTweetsBanner />          ← "5 new tweets" sticky bar
  </FeedTimeline>
</FeedApp>
```

**Key Technical Decisions:**
- **Feed loading**: `useInfiniteQuery` with cursor pagination. Load 20 tweets per page. Prefetch next page when user is 5 tweets from bottom
- **Optimistic engagement**: Like → immediately increment count + fill heart. API call in background. On failure, revert. This is why Twitter likes sometimes "flicker"
- **Real-time new tweets**: SSE connection. On new tweet event, increment counter badge ("5 new tweets"). Don't auto-inject into feed (causes scroll jump / CLS). User clicks to load
- **Text parsing**: Parse tweet text to identify @mentions (link to profile), #hashtags (link to search), URLs (render as cards with preview). Use regex + linkification library
- **Media grid**: 1 image = full width. 2 = side by side. 3 = one large + two small. 4 = 2×2 grid. Aspect ratios preserved with `object-fit: cover`

**Performance:**
- **Virtualization**: Only render ~15-20 tweets in DOM
- **Image optimization**: WebP/AVIF, responsive `srcset`, lazy load below fold
- **Video**: Don't autoplay. Load poster image only. On viewport entry (IntersectionObserver), autoplay muted (Twitter behavior)
- **Memoize TweetCard**: Only re-render when tweet data changes (compare by `tweet.id + tweet.updatedAt`)

**Trade-offs:**
- Push vs pull for new tweets: Push (SSE) = real-time but server cost. Pull (poll every 30s) = simpler but delayed. Twitter uses push for the "new tweets" counter, pull for the actual feed content
- Precomputed feed (fanout on write) vs query on read: This is the backend debate, but frontend cares because it affects latency. Precomputed = instant load from cache. Query = slower but more fresh
- Inline media vs click-to-expand: Inline = richer but heavier page. Twitter shows images inline but videos as poster-only until interaction

**Follow-ups:**
- "How do you handle a tweet going viral (10M likes)?" → Frontend doesn't need exact count. Show "10M" not "10,342,891". Use abbreviated counts. Update periodically, not real-time
- "How do you prevent XSS in tweet content?" → Never `dangerouslySetInnerHTML`. Parse tweet text into structured tokens (text, mention, hashtag, url), render each with the appropriate React component

🔥 **Most Asked**: Infinite scroll virtualization, optimistic likes, new tweet insertion strategy
⚠️ **Common Mistakes**: Auto-inserting new tweets (CLS!); not virtualizing; using dangerouslySetInnerHTML for tweet content
🧠 **Strategy**: The "new tweets banner" pattern is the star answer. It shows you understand CLS and user experience

---

## 18. Maps Application Frontend

### Q1: Design a maps application frontend like Google Maps.

**Answer (Interview-Ready):**

**Requirements:**
- Render a pannable, zoomable map with tiles
- Search locations with autocomplete
- Display markers, routes, and overlays
- Turn-by-turn navigation UI
- Works on mobile (touch gestures)

**Component Architecture:**
```
<MapsApp>
  <SearchOverlay>
    <SearchAutocomplete />
    <SearchResults />
    <DirectionsPanel />         ← origin, destination, waypoints
  </SearchOverlay>
  <MapCanvas>                   ← tile renderer (Mapbox GL / Leaflet)
    <TileLayer />               ← base map tiles (raster or vector)
    <MarkerLayer />             ← location pins, clusters
    <RouteLayer />              ← polyline for directions
    <UserLocation />            ← blue dot with accuracy circle
  </MapCanvas>
  <MapControls>
    <ZoomButtons />
    <LayerSwitcher />           ← satellite, terrain, traffic
    <CurrentLocationButton />
  </MapControls>
  <BottomSheet />               ← location details, reviews
</MapsApp>
```

**Key Technical Decisions:**
- **Tile-based rendering**: Map is divided into tiles (256×256px images or vector tiles). On zoom/pan, load new tiles for visible area. This is how all production maps work
- **Library choice**: Mapbox GL JS (WebGL-based, vector tiles, smooth) or Leaflet (simpler, raster tiles). For Google Maps quality → Mapbox GL. For simpler use → Leaflet
- **Marker clustering**: 1000+ markers on screen → cluster into groups. Use `supercluster` library. Zoom in → cluster splits into individual markers
- **Vector tiles vs raster tiles**: Vector = smaller, styleable, sharp at any zoom. Raster = pre-rendered images, simpler but can't restyle. Modern apps use vector
- **Geolocation**: Use `navigator.geolocation.watchPosition()` for continuous tracking. Show accuracy circle. Handle permission denial gracefully

**Performance:**
- **Tile caching**: Browser caches map tiles (HTTP Cache-Control headers). Service Worker for offline map support
- **Debounce pan/zoom**: Don't request tiles on every pixel of pan. Wait for pan to stop (100ms debounce)
- **Marker virtualization**: Only render markers in the current viewport + small buffer. Recalculate on pan/zoom
- **WebGL rendering**: Mapbox GL uses WebGL for 60fps panning/zooming even with complex overlays

**Trade-offs:**
- Vector vs raster tiles: Vector = better quality + smaller + styleable, but needs WebGL. Raster = simpler, works everywhere, but larger downloads and fixed style
- Online-only vs offline maps: Offline requires downloading tile packages (100MB+ per city). Worth it for navigation apps, overkill for simple location pickers

**Follow-ups:**
- "How does Google Maps render so smoothly?" → WebGL rendering, aggressive tile caching, predictive tile loading (preload tiles around viewport edge), vector tiles (smaller than raster), LOD (level of detail) — show less detail at higher zoom levels
- "How do you implement route display?" → Server returns array of [lat, lng] coordinates. Render as polyline on the map. For navigation, highlight the current segment. Animate a position marker along the route
- "How do you handle 100K markers?" → Clustering is mandatory. At zoom 5: show 50 clusters. At zoom 15: show individual markers. Use spatial indexing (R-tree) for fast viewport queries

🔥 **Most Asked**: Tile rendering architecture, marker clustering, WebGL performance
⚠️ **Common Mistakes**: Not mentioning tile-based rendering; trying to render all markers at once; ignoring offline support
🧠 **Strategy**: Start with "Maps use a tile-based rendering system..." — this immediately establishes knowledge

---

## 19. Code Editor

### Q1: Design a browser-based code editor like CodePen or the VS Code web editor.

**Answer (Interview-Ready):**

**Requirements:**
- Syntax highlighting for multiple languages
- Line numbers, auto-indent, bracket matching
- Multi-file tabs
- Live preview (for HTML/CSS/JS)
- Split-pane resizable editor + preview

**Component Architecture:**
```
<CodeEditorApp>
  <TabBar />                     ← open files as tabs
  <SplitPane>                    ← resizable panels
    <EditorPane>
      <MonacoEditor />           ← core editor (Monaco or CodeMirror)
    </EditorPane>
    <PreviewPane>
      <iframe />                 ← sandboxed live preview
    </PreviewPane>
  </SplitPane>
  <StatusBar />                  ← cursor position, language, encoding
  <Terminal />                   ← optional: embedded terminal
</CodeEditorApp>
```

**Key Technical Decisions:**
- **Editor core**: Monaco Editor (same as VS Code) or CodeMirror 6. Both handle syntax highlighting, autocomplete, keybindings, themes. Don't build from scratch
- **Syntax highlighting**: Uses TextMate grammars (Monaco) or Lezer parsers (CodeMirror). Language support is pluggable
- **Live preview**: Compile user's HTML/CSS/JS into an iframe using `srcdoc` or `Blob URL`. Debounce compilation (300ms after last keystroke). **Sandboxed** iframe with `sandbox="allow-scripts"` to prevent breakout
- **Multi-file**: Virtual file system in memory. `Map<string, string>` for file name → content. Persist to localStorage or server
- **Split pane**: CSS `grid-template-columns` with draggable divider. Store panel sizes in state

**Performance:**
- **Lazy load languages**: Don't load all 50 syntax definitions upfront. Load on first use of that language
- **Incremental parsing**: Editor only re-parses changed regions, not the entire file (both Monaco and CodeMirror do this)
- **Web Worker for compilation**: Run JS bundling/compilation in a Web Worker to avoid blocking the editor. Use esbuild-wasm for fast bundling in browser
- **Large file handling**: For files >10K lines, disable some features (minimap, bracket colorization) for performance

**Trade-offs:**
- Monaco vs CodeMirror: Monaco is heavier (~2MB) but has VS Code-level features. CodeMirror is lighter (~200KB) and more modular. For a full IDE → Monaco. For embedded editor → CodeMirror
- iframe preview: Secure (isolated) but limited communication (postMessage only). Direct DOM rendering: faster but unsafe (user code can break the editor)

**Follow-ups:**
- "How do you handle collaboration?" → Same as collaborative editor (OT/CRDT). Monaco has a collaboration API. Or use Yjs + Monaco binding
- "How do you handle execution of arbitrary code safely?" → iframe sandbox. CSP headers. For server-side execution: use containers (Docker) with resource limits
- "How do you support autocomplete/IntelliSense?" → Monaco supports Language Server Protocol (LSP) via Web Workers. TypeScript has a full-feature language service that runs in the browser

🔥 **Most Asked**: Monaco vs CodeMirror, iframe sandboxing for preview, incremental parsing
⚠️ **Common Mistakes**: Trying to build syntax highlighting from scratch; not sandboxing the preview; loading all languages upfront
🧠 **Strategy**: "I'd use Monaco/CodeMirror as the core because building a text editor is a multi-year project." Then focus on the architecture around it

---

## 20. Comment System (Reddit)

### Q1: Design a threaded comment system like Reddit or Hacker News.

**Answer (Interview-Ready):**

**Requirements:**
- Nested/threaded comments (unlimited depth)
- Upvote/downvote with score
- Sort by: best, new, top, controversial
- Expand/collapse threads
- Load more replies lazily

**Component Architecture:**
```
<CommentSection>
  <SortSelector />               ← best | new | top
  <CommentComposer />           ← top-level comment
  <CommentThread>
    <Comment>                    ← recursive component
      <CommentHeader />          ← author, timestamp, score
      <CommentBody />            ← markdown rendered content
      <CommentActions />         ← upvote, downvote, reply, share
      <ReplyComposer />          ← inline reply form (toggled)
      <CommentThread>            ← nested children (recursive)
        <Comment />
        <LoadMoreReplies />      ← "Load 15 more replies"
      </CommentThread>
    </Comment>
  </CommentThread>
</CommentSection>
```

**Key Technical Decisions:**
- **Data structure**: Tree structure with `parentId`. Server returns flattened list with `parentId` references. Client builds tree on render
  ```typescript
  type Comment = { id: string; parentId: string | null; author: string; body: string; score: number; children?: Comment[] }
  ```
- **Lazy loading children**: Don't load all 500 replies to a top comment. Load first 3 and show "Load 15 more replies" button. API: `GET /comments/{parentId}/replies?limit=15&after=cursor`
- **Depth limit rendering**: Render up to 10 levels. Beyond that, show "Continue this thread →" link (new page/view). Prevents extreme indentation on mobile
- **Markdown rendering**: Use `react-markdown` or `marked` for safe rendering. Sanitize output with DOMPurify
- **Sorting**: Server-side sort for top-level comments (complex scoring algorithms). Client-side re-sort for small threads (<50 comments)

**Performance:**
- Collapse deep threads by default (show 3 levels, collapsed beyond)
- Virtualize comment list for posts with 1000+ comments
- Memoize Comment components (`React.memo` with `comment.id + comment.score` comparison)
- Lazy render collapsed threads — don't mount children until expanded

**Trade-offs:**
- Recursive component vs flat list with indentation: Recursive is more natural for tree data but harder to virtualize. Flat with `depth * indent` is virtualizable. Reddit uses flat
- Real-time updates: Live vote counts look cool but are expensive. Better: update on action only (optimistic) and refetch when user explicitly refreshes

**Follow-ups:**
- "How does Reddit's 'Best' sort work?" → Wilson score interval. Accounts for both upvotes AND total votes. A comment with 100 up / 1 down ranks higher than 1000 up / 500 down, because it has a higher confidence interval
- "How do you handle deleted comments with replies?" → Show "[deleted]" placeholder with children still visible. Don't remove the node from the tree — orphaned children would be lost
- "How do you prevent XSS in user comments?" → Markdown → HTML rendering with DOMPurify sanitization. Never allow raw HTML input. Whitelist safe tags only

🔥 **Most Asked**: Tree data structure, lazy child loading, depth limiting, sort algorithm
⚠️ **Common Mistakes**: Loading entire comment tree upfront; unlimited nesting depth; no XSS protection
🧠 **Strategy**: Discuss the tree structure and lazy loading strategy first. Then mention the depth limit — it shows you think about mobile UX

---

## 21. Shopping Cart + Checkout

### Q1: Design the frontend for a shopping cart and checkout flow (Amazon/Flipkart).

**Answer (Interview-Ready):**

**Requirements:**
- Cart with item list, quantities, price calculation
- Persist cart across devices (logged-in) and sessions (guest)
- Checkout: address, payment, order summary, place order
- Apply coupons/discounts
- Handle inventory changes (item sold out during checkout)

**Component Architecture:**
```
<CartPage>
  <CartItemList>
    <CartItem />                 ← image, name, price, quantity ± buttons, remove
  </CartItemList>
  <CartSummary>                  ← subtotal, tax, shipping estimate, coupon
    <CouponInput />
    <ProceedToCheckout />
  </CartSummary>
</CartPage>

<CheckoutWizard>
  <AddressStep />                ← saved addresses + add new
  <PaymentStep />                ← saved cards or enter new
  <ReviewStep />                 ← final order summary
  <ConfirmationStep />           ← order placed, tracking info
</CheckoutWizard>
```

**Key Technical Decisions:**
- **Cart state**: Server-authoritative. Every cart change → API call → update local cache. Cart stored in server DB (logged-in) or localStorage + server session (guest)
- **Optimistic quantity update**: Change quantity visually immediately. API call to validate stock. If out of stock → revert and show "Only 3 available" message
- **Price calculation**: Always server-side. Never calculate final price on client (security risk — user could manipulate). Client shows estimated total; server confirms on checkout
- **Inventory check at checkout**: When user clicks "Place Order," server validates inventory in real-time. If item sold out → show error, don't charge. Use "reserve for 10 minutes" pattern during checkout
- **Payment integration**: Use hosted payment forms (Stripe Elements, Razorpay) — PCI compliance requires card data never touches your servers

**Performance:**
- **Cart badge count**: Global state (Context or Zustand). Updated on add/remove, visible on all pages
- **Prefetch checkout steps**: While user reviews cart, prefetch address and payment APIs
- **Cart merge on login**: Guest adds items. Logs in. Merge guest cart with server cart (union, keep higher quantity). This is a common interview follow-up

**Trade-offs:**
- Client-side vs server-side price calculation: Client = instant feedback but vulnerable to manipulation. Server = authoritative but requires API call. Recommendation: client for display, server for truth
- Single-page checkout vs multi-step: Single page = faster for repeat customers. Multi-step = less overwhelming for new users. Amazon does single-page for Prime users

**Follow-ups:**
- "How do you handle the cart across tabs?" → Use `BroadcastChannel` API or `localStorage` event listener. When cart updates in one tab, other tabs sync
- "How do you prevent double-submit on 'Place Order'?" → (1) Disable button on click, (2) Idempotency key in the API request, (3) Server deduplication within 10-second window
- "How do you handle price changes?" → When user opens cart, compare current prices with saved prices. Show "Price changed" warning next to affected items

🔥 **Most Asked**: Cart state persistence, price calculation authority, inventory handling, double-submit prevention
⚠️ **Common Mistakes**: Client-side price calculation; no inventory validation at checkout; no double-submit protection
🧠 **Strategy**: Emphasize security: "Price calculation must be server-authoritative." This is the senior-level insight

---

## 22. Photo Editor (Canva-lite)

### Q1: Design a browser-based photo editor with layers, filters, and text overlays.

**Answer (Interview-Ready):**

**Requirements:**
- Canvas-based editing (crop, rotate, resize)
- Layer system (images, text, shapes stack)
- Filters and adjustments (brightness, contrast, saturation)
- Text overlay with font selection
- Undo/redo stack
- Export as PNG/JPEG

**Component Architecture:**
```
<PhotoEditor>
  <Toolbar>                      ← crop, rotate, filters, text, shapes
    <FilterPanel />              ← preset filters + custom adjustments
    <TextPanel />                ← font, size, color
  </Toolbar>
  <CanvasWorkspace>
    <canvas />                   ← main editing canvas (Fabric.js / Konva.js)
    <TransformHandles />         ← resize/rotate controls on selected object
  </CanvasWorkspace>
  <LayerPanel>                   ← ordered list of layers, visibility toggle
    <LayerItem />                ← thumbnail, name, lock, eye icon
  </LayerPanel>
</PhotoEditor>
```

**Key Technical Decisions:**
- **Canvas library**: Fabric.js (feature-rich, object model on canvas) or Konva.js (React-friendly). Both provide object selection, transforms, serialization
- **Layer model**: Each layer is a Fabric/Konva object (image, text, shape). Z-order = array index. Operations: reorder, toggle visibility, lock, opacity
- **Undo/redo**: Command pattern. Every action creates a new state snapshot (or a reversible command). Stack of snapshots. Limit to 50 for memory
  - Alternative: Store diffs instead of full snapshots (memory efficient for large canvases)
- **Filters**: CSS filters for preview (fast, GPU-accelerated). Apply via canvas pixel manipulation (getImageData → process → putImageData) for export. Use Web Workers for heavy filters (blur, sharpen)
- **Export**: `canvas.toDataURL('image/png')` or `canvas.toBlob()` for better memory management

**Performance:**
- **Offscreen canvas**: Render filter previews on an OffscreenCanvas in a Web Worker
- **Debounce adjustments**: Slider changes for brightness/contrast → debounce 50ms before re-rendering
- **Resolution**: Edit at display resolution (e.g., 1200px). Export at full resolution. Upscale at export time

**Trade-offs:**
- Full snapshot undo vs command pattern: Snapshots are simpler but memory-heavy (each snapshot = full canvas state). Commands are memory-efficient but complex to implement reverse operations
- Canvas 2D vs WebGL: Canvas 2D covers most cases. WebGL for complex filters (GPU shaders) and 60fps interaction with large canvases

**Follow-ups:**
- "How does Canva handle collaboration?" → Each element is identified by ID. CRDTs track element additions/modifications. Real-time sync via WebSocket. Conflict: last transform wins per object
- "How do you handle very large images (50MP)?" → Don't load full resolution into canvas. Use a proxy (downsampled) for editing. Track operations as a chain. Apply to full resolution only on export (server-side)

🔥 **Most Asked**: Canvas vs DOM rendering, layer/undo architecture, filter performance with Web Workers
⚠️ **Common Mistakes**: Using DOM for the editor (can't apply pixel-level filters); loading full-resolution images into canvas; no undo
🧠 **Strategy**: "The editor is canvas-based with an object model managed by Fabric.js." Then discuss layers and undo/redo. This is the deep-dive gold

---

## 23. Polling/Voting Widget

### Q1: Design a poll widget that can be embedded in any page.

**Answer (Interview-Ready):**

**Requirements:**
- Display question with 2-5 options
- Vote, see results (bar chart with percentages)
- One vote per user (authenticated or cookie-based)
- Real-time results update
- Embeddable via `<script>` tag or iframe

**Component Architecture:**
```
<PollWidget>
  <PollQuestion />               ← question text
  {hasVoted ? (
    <PollResults>                ← bar chart + percentages
      <ResultBar />              ← animated width based on %
    </PollResults>
  ) : (
    <PollOptions>                ← clickable option list
      <PollOption />             ← radio-style selection
    </PollOptions>
  )}
  <PollFooter />                 ← total votes, share link
</PollWidget>
```

**Key Technical Decisions:**
- **Vote deduplication**: Authenticated → one vote per userId. Guest → cookie + IP fingerprinting. Not foolproof for guests, but sufficient for most use cases
- **Optimistic voting**: Show results immediately on vote. API call in background. On failure, revert to options view
- **Real-time results**: SSE for live vote count updates. Each vote triggers server broadcast of updated percentages
- **Embeddable**: Two options:
  - **iframe**: Simplest isolation, but limited styling customization
  - **Web Component**: Custom element that works in any framework, shadow DOM for style isolation
- **Animation**: Result bars animate from 0% to actual percentage using CSS transitions (`width` transition over 500ms)

**Performance:**
- Widget bundle < 15KB gzipped (entire widget including styles)
- No external dependencies (vanilla JS or Preact for minimal React-like DX)
- Lazy load: Don't block host page. Load widget script with `async defer`

**Trade-offs:**
- iframe vs Web Component: iframe = complete isolation but harder to resize dynamically. Web Component = native feel but requires more effort for style isolation
- Real-time vs refresh: Real-time is engaging but expensive. For low-traffic polls, show "Results updated automatically" with 5s polling

**Follow-ups:**
- "How do you prevent vote manipulation?" → Rate limiting per IP, CAPTCHA for suspicious activity, server-side validation, audit log of votes
- "How do you handle 1M concurrent voters?" → Queue votes on server, process async, return optimistic result. Update actual results in batch every second. Client shows "~10.2K votes" not exact count

🔥 **Most Asked**: Vote deduplication, embeddable architecture, real-time updates
⚠️ **Common Mistakes**: No vote deduplication; full React app for a simple widget (overkill); blocking host page with synchronous script
🧠 **Strategy**: Start with the embed strategy (iframe vs Web Component). Then discuss the voting flow. Small widget, but lots of architectural decisions

---

## 24. Toast/Snackbar System

### Q1: Design a toast notification system for a web application.

**Answer (Interview-Ready):**

**Requirements:**
- Show temporary messages (success, error, warning, info)
- Auto-dismiss after configurable duration (default 5s)
- Manual dismiss with close button
- Stack multiple toasts (max 5 visible)
- Accessible: screen reader announcements

**Component Architecture:**
```
<ToastProvider>                  ← Context provider + toast state
  <App />                       ← children can call useToast()
  <ToastContainer               ← portal to body, fixed position
    position="top-right">
    <Toast />                   ← individual toast with animation
    <Toast />
    <Toast />
  </ToastContainer>
</ToastProvider>
```

**API Design:**
```typescript
const { toast } = useToast();
toast.success("Saved successfully");
toast.error("Failed to save", { duration: 8000 });
toast.custom(<UndoToast onUndo={handleUndo} />);
```

**Key Technical Decisions:**
- **State management**: Array of toast objects in Context. `addToast()` appends. `removeToast()` filters by ID. Auto-remove via `setTimeout`
- **Animation**: CSS `@keyframes` — slide in from right, fade out on dismiss. Use `animation` property. For exit animation, set exiting state → wait for animation → remove from DOM
- **Stacking**: New toasts push older ones down. Max 5 visible. Queue additional toasts, show when slot opens
- **Accessibility**: Toast container has `role="status"` and `aria-live="polite"`. Screen readers automatically announce new content. Error toasts use `aria-live="assertive"`
- **Pause on hover**: Clear the auto-dismiss timeout when mouse enters. Restart when mouse leaves. This is a UX standard

**Implementation Pattern:**
```typescript
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const addToast = (message, options) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, ...options }]);
    setTimeout(() => removeToast(id), options.duration || 5000);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
  // ...
}
```

**Trade-offs:**
- Portal rendering: Toasts must be in a portal (outside the component tree) for correct z-index stacking. Trade-off: harder to test, but necessary for correct behavior
- Animation library (Framer Motion) vs CSS: Library = easier, smoother exit animations. CSS = smaller bundle, but exit animations are harder (need to delay unmount)

**Follow-ups:**
- "How do you handle undo toasts?" → Action toast stays longer (10s) with "Undo" button. On undo click, call the reverse action. On timeout, execute the original action. This is the "Gmail undo send" pattern
- "How do you prevent toast pile-up during errors?" → Deduplicate by message content. If same error message is already showing, don't add another. Or replace the existing toast with an updated count

🔥 **Most Asked**: Undo toast pattern, accessibility with aria-live, animation with clean unmount
⚠️ **Common Mistakes**: No accessibility; no pause on hover; toasts blocking content; no max limit on visible toasts
🧠 **Strategy**: Show the API design first (useToast hook). Then discuss the implementation. Clean APIs impress interviewers

---

## 25. Modal/Dialog Manager

### Q1: Design a modal/dialog system that handles stacking, focus trapping, and accessibility.

**Answer (Interview-Ready):**

**Requirements:**
- Open/close modals programmatically
- Stack modals (modal opens another modal)
- Focus trap: Tab stays within modal
- Close on Escape, close on backdrop click
- Accessible: `role="dialog"`, `aria-modal`, focus management

**Key Technical Decisions:**
- **Portal rendering**: Modal renders via `createPortal` to `document.body`. Ensures proper z-index regardless of component nesting
- **Focus trap**: On mount, save `document.activeElement`. Move focus to first focusable element inside modal. On Tab, cycle within modal. On unmount, restore focus to saved element
- **Stacking**: Each modal gets `z-index: base + stackIndex`. Maintain a modal stack in context. Close = pop from stack. Only top modal receives keyboard events
- **Backdrop**: Semi-transparent overlay. Click to close (configurable). For stacked modals, each has its own backdrop
- **Body scroll lock**: When modal is open, set `body { overflow: hidden }`. Restore on close. Handle iOS quirk (need `-webkit-overflow-scrolling` fix)

**Accessibility:**
- `role="dialog"` + `aria-modal="true"` on modal container
- `aria-labelledby` pointing to the modal title
- On open: announce title content to screen reader
- On Escape: close top-most modal
- Focus trap prevents tabbing to content behind the modal

**Implementation:**
```typescript
const { openModal, closeModal } = useModalManager();

openModal({
  title: "Confirm Delete",
  content: <ConfirmDialog />,
  closable: true,
  size: "sm",
});
```

**Trade-offs:**
- Headless (Radix Dialog) vs custom: Radix handles all accessibility out of the box. Custom gives full control but you must implement focus trap, scroll lock, and keyboard handling yourself
- Imperative vs declarative API: `openModal(config)` is imperative (easier to call from event handlers). `<Modal isOpen={...}>` is declarative (React-idiomatic). Support both

**Follow-ups:**
- "How do you handle animations?" → No-animation open is instant. CSS animation on mount (fade + slide). On close, need to delay unmount until exit animation completes
- "How do you prevent the scroll jump on body scroll lock?" → Save current `scrollY`, set `body { position: fixed; top: -${scrollY}px }`. On close, restore `scrollTop` and remove fixed positioning

🔥 **Most Asked**: Focus trap implementation, stacking z-index, body scroll lock, accessibility
⚠️ **Common Mistakes**: No focus trap; no scroll lock; no keyboard (Escape) handling; not using portal
🧠 **Strategy**: Mention Radix/Headless UI as the library choice, but explain the internals (focus trap, scroll lock) to show understanding

---

## 26. Virtualized List/Table (1M rows)

### Q1: Design a virtualized table that renders 1M rows smoothly.

**Answer (Interview-Ready):**

**Requirements:**
- Render 1M rows without performance degradation
- Sortable columns, filterable
- Fixed header, fixed columns (freeze panes)
- Resizable columns
- Row selection (single + multi)

**Key Technical Decisions:**
- **Windowing**: Only render rows in the viewport + overscan buffer (typically 5-10 rows above/below). As user scrolls, recycle DOM elements by updating their content
- **Library**: `@tanstack/react-virtual` (most flexible) or `react-window` (simpler)
- **How it works**:
  1. Container has `overflow: auto` and a fixed height
  2. Inner div has total height = `rowCount × rowHeight` (creates proper scrollbar)
  3. Only ~30 actual row elements rendered, positioned with `transform: translateY(offset)`
  4. On scroll → recalculate visible range → update positions and content
- **Fixed headers**: Separate `<thead>` outside the scrollable area (position: sticky) or sync scroll position between header and body
- **Column resizing**: Track column widths in state. On drag, update width. Apply inline styles. Debounce re-render during drag

**Performance:**
- **Fixed row height**: Much faster (can calculate position from index without measurement). Variable height requires measuring each row, caching heights, and binary search for position
- **Sorting 1M rows**: Must be server-side or Web Worker. `Array.sort()` on 1M items blocks main thread for ~500ms. Send sort criteria to server, get sorted page back
- **Filtering**: Same as sorting — server-side for large datasets. Client-side for <10K rows
- **Memoize rows**: Each row wrapped in `React.memo`. Only re-render if its data changes

**Data Fetching:**
- Don't load 1M rows into memory. Use windowed data fetching:
  - Visible range: rows 500-530
  - Fetch: rows 400-630 (buffer)
  - As user scrolls to row 600, fetch rows 500-730
  - Cache fetched pages. Evict oldest pages to keep memory bounded

**Trade-offs:**
- Fixed vs variable row heights: Fixed is 10x simpler and faster. Variable is necessary for content like comments but requires measurement and caching
- Canvas-based table vs DOM: Canvas handles millions of cells (spreadsheet-style). DOM-based is more accessible and supports native browser features (text selection, right-click). For data tables, DOM + virtualization. For spreadsheets, Canvas

**Follow-ups:**
- "How do you handle column pinning (freeze)?" → Split table into 2-3 synchronized sections: frozen-left, scrollable-center, frozen-right. Sync vertical scroll between them
- "How do you handle cell editing?" → Double-click activates edit mode. Replace cell with `<input>`. On blur/Enter, commit. Only one cell editable at a time
- "How do you handle 1M rows on mobile?" → Even more critical. Phone has less memory and slower CPU. Limit visible rows to 15-20. Increase overscan buffer for smooth scrolling. Consider server-side pagination instead

🔥 **Most Asked**: Windowing mechanics, fixed vs variable height, server-side sort/filter
⚠️ **Common Mistakes**: Rendering all rows to DOM; client-side sorting of 1M rows; no overscan buffer; forgetting accessibility
🧠 **Strategy**: Explain the windowing algorithm step by step. Draw the scrollable container with inner height. This visual explanation clicks immediately

---

## 27. Accessibility-First Component

### Q1: Design an accessible date picker from scratch. How do you ensure WCAG AA compliance?

**Answer (Interview-Ready):**

**Requirements:**
- Calendar grid with month navigation
- Keyboard navigation (arrow keys, Enter to select)
- Screen reader support (announces dates, selected state, month changes)
- Focus management (focus stays in calendar when navigating)
- WCAG 2.1 AA compliance

**ARIA Pattern (Dialog Date Picker):**
```html
<div role="dialog" aria-modal="true" aria-label="Choose date">
  <div role="group" aria-label="December 2026">
    <button aria-label="Previous month">←</button>
    <span>December 2026</span>
    <button aria-label="Next month">→</button>
  </div>
  <table role="grid" aria-label="December 2026">
    <thead>
      <tr><th abbr="Sunday">Su</th>...</tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <button
            role="gridcell"
            aria-selected="true"
            aria-label="December 15, 2026, Saturday"
            tabIndex={isCurrentFocus ? 0 : -1}>
            15
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

**Key Technical Decisions:**
- **Keyboard navigation**:
  - Arrow keys: move focus between days (Left/Right = prev/next day, Up/Down = prev/next week)
  - Home/End: first/last day of week
  - PageUp/PageDown: previous/next month
  - Enter/Space: select focused date
  - Escape: close picker
- **Roving tabindex**: Only the focused date has `tabIndex={0}`. All others have `tabIndex={-1}`. This means Tab moves focus out of the grid, arrow keys navigate within
- **Screen reader**: Each date button has `aria-label` with full date ("December 15, 2026, Saturday"). `aria-selected` marks chosen date. Month change triggers `aria-live` announcement
- **Focus management**: On open, focus moves to currently selected date (or today). On close, focus returns to the trigger button

**Trade-offs:**
- Native `<input type="date">` vs custom: Native is automatically accessible but inconsistent across browsers and not customizable. Custom date picker gives design control but requires implementing ALL accessibility features
- Calendar only vs text input + calendar: Text input allows typed dates (important for power users and screen reader users). Date validation with clear error messages

**Follow-ups:**
- "How do you handle date ranges?" → Two calendars side by side. First click sets start, second click sets end. Highlight range between them. `aria-label` on range dates: "December 15, start of range" and "December 20, end of range"
- "How do you test accessibility?" → (1) axe-core in unit tests, (2) Keyboard-only manual testing, (3) Screen reader testing (VoiceOver on Mac, NVDA on Windows), (4) Lighthouse accessibility audit in CI

🔥 **Most Asked**: ARIA grid pattern, roving tabindex, keyboard navigation, screen reader announcements
⚠️ **Common Mistakes**: No keyboard support; using div instead of button for dates; no aria-labels; not managing focus
🧠 **Strategy**: Start by saying "I'll follow the WAI-ARIA date picker pattern." This signals expertise immediately. Then walk through the keyboard and screen reader behavior

---

## 28. Micro-Frontend Architecture

### Q1: Design a micro-frontend architecture for a large application with 5 independent teams.

**Answer (Interview-Ready):**

**Requirements:**
- 5 teams own independent feature areas (shell, dashboard, settings, products, analytics)
- Independent deployment per team
- Shared header/navigation
- Consistent design system
- Different frameworks possible per micro-frontend (React, Angular, Vue)

**Architecture Options:**
| Approach | How It Works | Trade-offs |
|----------|-------------|------------|
| **Module Federation (Webpack 5)** | Runtime composition. Shell loads remote modules at runtime | Best DX, shared deps, but Webpack-specific |
| **iframe** | Each micro-frontend in its own iframe | Complete isolation, but poor UX (no shared scroll, navigation quirky) |
| **Web Components** | Each MFE packaged as custom elements | Framework-agnostic, but limited styling/state sharing |
| **Route-based** | Different apps at different routes (/dashboard = React, /settings = Angular) | Simple, but full page reload between MFEs |
| **Single-SPA** | Orchestrator mounts/unmounts apps on route change | Proven, framework-agnostic, but complex setup |

**Recommended: Module Federation:**
```
Shell App (host)
├── Loads shared deps (React, Design System)
├── Renders: Header, Navigation, Router
├── Dynamically imports remote modules:
│   ├── Dashboard MFE (remote)
│   ├── Products MFE (remote)
│   ├── Settings MFE (remote)
│   └── Analytics MFE (remote)
```

**Key Technical Decisions:**
- **Shared dependencies**: React, React DOM, and the design system are shared through Module Federation `shared` config. Only loaded once. Version pinning prevents conflicts
- **Communication**: Custom events (`CustomEvent`) for MFE-to-MFE communication. Or a shared event bus. Avoid direct imports between MFEs
- **Routing**: Shell owns top-level routes. Each MFE owns its sub-routes. `/dashboard/*` → Dashboard MFE handles internal routing
- **Shared state**: Minimal. Use URL state and custom events. If needed, a thin shared state module loaded by the shell
- **Design system**: Published as npm package. Each MFE imports it. Version mismatch = visual inconsistency, so enforce version with CI checks

**Performance:**
- Each MFE is code-split. Only load the active MFE's bundle
- Shared deps loaded once by shell. MFEs don't duplicate React (saves 40KB+ per MFE)
- Prefetch likely-next MFE on hover (e.g., hovering "Settings" → preload settings bundle)

**Trade-offs:**
- Module Federation: Best DX but ties you to Webpack. Vite support is emerging but not mature
- Team independence vs consistency: More independence = divergent UX. Enforce through design system + CI checks
- Shared vs isolated state: Shared = tightly coupled (defeats purpose). Isolated = harder to build cross-cutting features

**Follow-ups:**
- "How do you handle errors in one MFE?" → Error boundary per MFE. If Products MFE crashes, show fallback UI. Shell and other MFEs continue working. Log error to central monitoring
- "How do you handle authentication?" → Shell owns auth. Passes token to MFEs via shared context or custom event. MFEs include token in their API calls
- "How do you deploy independently?" → Each MFE has its own CI/CD pipeline. Deploys to its own CDN path. Shell references remote entry points. No coordination needed for most deployments

🔥 **Most Asked**: Module Federation vs alternatives, shared dependency management, inter-MFE communication
⚠️ **Common Mistakes**: Using iframes (poor UX); no design system enforcement; too much shared state; choosing micro-frontends when a monolith would be simpler
🧠 **Strategy**: Start by asking "How many teams and how independent do they need to be?" Micro-frontends are an organizational solution, not a technical one. Don't recommend them for small teams

---

## 29. PWA Offline-First Application

### Q1: Design a Progressive Web App with offline-first capabilities.

**Answer (Interview-Ready):**

**Requirements:**
- Works offline (reads cached data, queues writes)
- Installable (Add to Home Screen)
- Push notifications
- Background sync for pending actions
- Fast — app shell loads instantly on repeat visits

**Architecture:**
```
Client (PWA)
├── App Shell (HTML + CSS + JS) — cached by Service Worker
├── Service Worker
│   ├── Cache Strategy Manager
│   │   ├── Network-First (for API data)
│   │   ├── Cache-First (for static assets)
│   │   └── Stale-While-Revalidate (for non-critical data)
│   ├── Background Sync Queue
│   └── Push Notification Handler
├── IndexedDB — offline data store
├── Web App Manifest — install prompt, icons, theme
```

**Key Technical Decisions:**
- **Caching strategies** (Workbox library recommended):
  - `CacheFirst` for static assets (CSS, JS, images) — always fast, update in background
  - `NetworkFirst` for API data — try network, fall back to last cached version
  - `StaleWhileRevalidate` for non-essential content — serve cached immediately, update cache from network in background
- **Offline data**: IndexedDB for structured data (Dexie.js for nicer API). Store last-fetched data. Show "Offline — showing cached data" banner when network is unavailable
- **Background Sync**: When user submits a form offline, queue it in IndexedDB. Register a `sync` event. When connectivity returns, Service Worker processes the queue
- **App Shell pattern**: Minimal HTML/CSS/JS that renders the layout (header, nav, footer, loading state). Cache this aggressively. Content loads dynamically. Result: instant repeat-visit load
- **Web App Manifest**: `manifest.json` with app name, icons (192px, 512px), theme color, display mode (`standalone`). This enables "Add to Home Screen"

**Performance:**
- App shell cached → repeat visit loads in <1 second (from disk cache, no network)
- Precache critical routes on first visit
- Runtime cache with size limits (max 50 API responses, LRU eviction)
- Navigation preload: while Service Worker boots, start fetching the page in parallel

**Trade-offs:**
- Offline-first adds significant complexity. Only worth it for apps where offline use is a real use case (field workers, travel apps, note-taking)
- IndexedDB API is clunky. Use a wrapper library (Dexie.js, idb) or the Cache API for simpler cases
- Service Worker has a lifecycle (install → activate → fetch) that's tricky to get right. Workbox abstracts most of it
- Push notifications have declining permission grant rates (~15%). Don't gate features on push

**Follow-ups:**
- "How do you handle conflicts when syncing offline changes?" → Last-write-wins for simple data. Conflict resolution UI for complex data (show both versions, let user choose). Timestamp-based merge for concurrent edits
- "How do you update the Service Worker?" → On new deployment, browser detects updated SW file. New SW installs in background. Activates on next navigation. Show "New version available — click to update" toast
- "How do you handle the first visit (nothing cached)?" → First visit is always online. SW installs + precaches during first visit. Second visit onwards gets offline support. Show "This app works offline" notification after install

🔥 **Most Asked**: Caching strategies (must know all 3), background sync, App Shell pattern, SW lifecycle
⚠️ **Common Mistakes**: Caching everything (bloated cache); not handling SW updates; no conflict resolution for offline changes; forgetting the first visit is always online
🧠 **Strategy**: Draw the Service Worker → Cache → IndexedDB flow. Mention Workbox by name. Walk through the 3 caching strategies with examples for each

---
---

> **End of Part 05 — Frontend System Design Case Studies**
> 29 complete case studies covering UI components, large systems, and architectural patterns
> Next: [06 — JavaScript, Browser & TypeScript Internals](06_JS_Browser_TypeScript.md)

<!-- END_OF_CONTENT -->
