# Design Trello

*Drag & Drop, Infinite Boards, Real-Time Sync & Virtualization*

**Frontend System Design Handbook — Staff/Principal-Level Interview Preparation**

---

# PART 1 — Problem Statement

## Business Requirements

- Trello's value proposition is a **visually direct, low-friction project-management surface** (boards/lists/cards) that individuals adopt for free and teams pay to extend with power-ups, automation, and admin controls. The frontend has to feel like a physical corkboard — instant, tactile, forgiving — while quietly running a fully synchronized multi-user backend underneath.
- Adoption is bottom-up: a single user starts a board, then invites teammates, then a whole org standardizes on it. The architecture must support seamless scaling from "one person's to-do list" to "an org's cross-team workflow tool" without a rearchitecture in between.

## Functional Requirements

- **Boards, lists, and cards** as the core hierarchy, with **drag-and-drop** reordering of cards within a list, across lists, and across boards.
- **Real-time updates**: when a teammate moves, edits, or comments on a card, every other open client reflects it within roughly a second.
- Card detail view: description, checklist, due date, labels, attachments, comments, activity log, assigned members.
- **Infinite/large boards**: lists can hold thousands of cards (e.g., a backlog list); the board view must stay responsive regardless.
- Multiple boards per workspace, board templates, board-level and card-level permissions/visibility (private, workspace, public).
- Automation/power-ups (e.g., Butler rules, third-party integrations) that can programmatically move or modify cards.
- Notifications: in-app and push, for mentions, due dates, and changes to watched cards.

## Non-Functional Requirements

- **Drag responsiveness**: the dragged card must track the pointer within a single animation frame (~16 ms budget) — any perceptible lag during drag is immediately and universally noticed by users.
- **Real-time propagation**: remote changes visible within ~1 second under normal network conditions.
- **Scalability**: support boards with tens of thousands of cards and workspaces with thousands of boards, without the board view degrading.
- **Offline tolerance**: card moves and edits made offline should queue and reconcile, not be silently lost.
- **Accessibility**: drag-and-drop is the single hardest accessibility problem in this product — there must be a full non-pointer (keyboard) equivalent for every drag operation.

## User Scale Assumptions

- Tens of millions of monthly active users; a heavy-tailed distribution of board sizes — most boards are small (tens of cards), but a meaningful population of "system of record" boards (engineering backlogs, support queues) run into the thousands or tens of thousands of cards.
- Concurrent editors per board are typically low (2–10) but can spike during team planning sessions.

## Performance Expectations

- Board open-to-interactive under ~1.5 seconds for typical boards; progressive loading for very large lists.
- Drag-and-drop must never block on a network round-trip — the visual reorder happens locally and instantly, with persistence happening asynchronously.
- Real-time updates must not cause visible jank or layout thrash in a board the user is actively interacting with.

## Accessibility Requirements

- WCAG 2.1 AA baseline; full keyboard alternative to drag-and-drop (e.g., a "Move card…" menu/dialog reachable from the keyboard that performs the same reorder).
- Screen reader announcements of a card's new position after any move, whether performed by mouse, keyboard, or a remote collaborator.

## Security Requirements

- Board-level visibility controls (private/workspace/public) enforced consistently across UI, API, and any embedded power-up/iframe context.
- Power-ups and third-party integrations run in a sandboxed context with an explicit, limited permission model — they must not get unrestricted access to all board data by default.
- Attachment storage with scoped, time-limited access URLs rather than permanently public links.

---

# PART 2 — Interviewer's Expectations

## What Interviewers Evaluate

- Can the candidate design a **drag-and-drop reordering data model** that doesn't require rewriting every other card's position on each move?
- Do they understand the difference between **local-first interaction** (the drag itself) and **eventual persistence/sync** (telling the server and other clients about the result)?
- Can they reason about **virtualization for both vertical (long lists) and horizontal (many lists) axes** simultaneously, which is a step harder than a simple single-direction virtualized list?
- Do they treat keyboard accessibility for drag-and-drop as a core requirement rather than an afterthought?

## Common Mistakes

- Proposing to store card order as a simple integer index per list, requiring an update to every subsequent card's index on every single move — this doesn't scale and is a common, quickly-identified design flaw.
- Designing drag-and-drop as something that round-trips to the server on every pixel of movement.
- Treating the board as a single flat list and forgetting that virtualization here is two-dimensional (many lists, each independently scrollable, each potentially very long).
- No keyboard-accessible alternative to drag-and-drop at all.

## Red Flags

- "I'd just re-save the whole board's state on every change" — both a performance and a conflict-resolution red flag.
- No idempotency/ordering story for what happens when two users drag the same card to different places nearly simultaneously.
- Assuming drag-and-drop libraries handle virtualization, accessibility, and real-time remote updates all for free with no integration work.

## Strong Signals

- Proposes **fractional/lexicographic ordering keys** (e.g., assigning a card a position value that sorts between its neighbors, like `"a"` between `""` and `"b"`, or a fractional number) so a single move only updates the moved card's position, not its neighbors.
- Separates the **drag interaction layer** (pointer tracking, visual feedback, completely local and immediate) from the **persistence layer** (a single network call once the drag ends).
- Discusses **optimistic reordering** with rollback if the server rejects the move (e.g., due to a permission change mid-drag).
- Designs the keyboard equivalent for drag-and-drop as a first-class feature, not a compliance checkbox.

## Staff-Level Signals

- Recognizes that **fractional ordering keys can collide or degrade in precision** after many moves in the same spot, and proposes a periodic rebalancing/compaction strategy.
- Frames real-time sync cost/benefit relative to board activity level — a rarely-touched archive board doesn't need the same push infrastructure investment as an actively-worked sprint board.
- Discusses how power-ups/third-party code are sandboxed so a buggy or malicious integration can't corrupt board state or exfiltrate data from boards it wasn't granted access to.
- Connects the ordering-key and virtualization decisions back to a concrete cost: engineering time to build/maintain vs. the actual scale of boards in practice (most boards are small; design for the tail without over-engineering the common case).

---

# PART 3 — Requirement Gathering

- What's the maximum realistic board size (cards per list, lists per board) we need to keep fully responsive?
- Is real-time collaboration required for this design, or is "refresh to see others' changes" acceptable for v1?
- Do we need a keyboard-accessible equivalent for drag-and-drop as a hard requirement, or is mouse-only acceptable for this exercise?
- Should we support offline card moves/edits with reconciliation, or assume connectivity?
- Do we need to support power-ups/third-party integrations that can read or modify board data?
- Is there a permissions model beyond "board owner" — e.g., workspace-level roles, guest access, public boards?
- What's the expected concurrency on a single board — a couple of teammates, or could it spike to dozens during a planning session?
- Do we need automation (rule-based card movement, e.g., "move to Done when checklist completes")?
- Is cross-board card movement (or board templates/copying) in scope?
- What's our tolerance for eventual consistency on card position — is a brief visual flicker acceptable if two users drag simultaneously?
- Do we need full activity history/audit log per card and per board?
- Should this design account for very large workspaces (thousands of boards) in the navigation/search experience?
- Is there a notification/digest requirement (mentions, due-date reminders) we should account for?
- What platforms are in scope — is this web-only, or do we need parity with native mobile drag interactions (touch-and-hold reordering)?

---

# PART 4 — High-Level Architecture

## Architecture Diagram (ASCII)

```
                            CLIENT (Browser)
┌───────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ Board Shell   │   │ List/Card Renderer   │   │ Drag-and-Drop Engine │
│ (nav, filter, │   │ (2-axis virtualized, │   │ (pointer tracking,   │
│ board switch) │   │ per-list windowing)  │   │ keyboard-move mode)  │
└───────────────┘   └──────────────────────┘   └──────────────────────┘
                                   ▼
      ┌────────────────────────────────────────────────────────┐
      │ Normalized Board Store (boards/lists/cards/positions)  │
      │ optimistic local mutation · pending-write queue · undo │
      └────────────────────────────────────────────────────────┘
                                   ▼
           ┌─────────────────┐          ┌─────────────────┐
           │ IndexedDB cache │          │ WebSocket conn  │
           │ (offline board  │          │ (card move/edit │
           │ state + queue)  │          │ events in/out)  │
           └─────────────────┘          └─────────────────┘
                                   ▼
                ┌─────────────────────────────────────┐
                │ Board Realtime Service              │
                │ validates moves, assigns/reconciles │
                │ position keys, broadcasts to peers  │
                └─────────────────────────────────────┘
                                   ▼
  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
  │ Board/Card Store │   │ Activity / Audit │   │ Power-Up Sandbox │
  │ (durable state)  │   │ Log Service      │   │ Runtime (iframe, │
  └──────────────────┘   └──────────────────┘   │ scoped API)      │
                                                └──────────────────┘
```

## Component Breakdown

- **Board shell**: persistent chrome — board switcher, filters, member avatars. Loaded once per board session.
- **List/card renderer**: the core view, virtualized along both axes — only nearby lists are fully rendered horizontally, and within each visible list, only nearby cards are rendered vertically.
- **Drag-and-drop engine**: owns pointer/touch tracking and the keyboard-move interaction mode; entirely local during the drag itself, emitting a single "commit" event when the drag ends.
- **Normalized board store**: the client's in-memory + IndexedDB-backed source of truth for boards/lists/cards and their position keys, with an optimistic mutation and pending-write queue.
- **Board realtime service**: the per-board coordination point — validates incoming moves, assigns/reconciles position keys when needed, and broadcasts the resulting state to all connected clients for that board.
- **Power-up sandbox runtime**: isolates third-party code (typically in a scoped iframe with a narrow message-passing API) so integrations can extend the product without full access to all board data or the ability to corrupt board state directly.

## Frontend Layers

1. **Shell layer** — navigation, board switching, design system primitives.
2. **Board view layer** — list/card rendering, virtualization, drag-and-drop.
3. **Data layer** — normalized store, optimistic mutations, position-key management, sync.
4. **Transport layer** — REST for CRUD, WebSocket for real-time card/list events.

## Backend Dependencies

- Board/card durable store.
- Board realtime/coordination service (per-board event ordering and fan-out).
- Activity/audit log service.
- Power-up sandbox runtime and its scoped data-access API.
- Attachment/blob storage with scoped access URLs.

## Data Flow

- **Drag a card**: the drag engine tracks the pointer and renders the card following it purely client-side, with no network calls during the drag. On drop, the client computes a new local position key for the card, applies it optimistically, and sends a single "move" event to the realtime service.
- **Realtime service validates and broadcasts**: it checks permissions, reconciles the position key against any concurrent moves (assigning a new, consistent key if there's a collision), persists the result, and broadcasts the authoritative move to all connected clients on that board, including the originator (which reconciles its optimistic guess with the authoritative result).
- **Remote move arrives**: the receiving client applies the position update to its normalized store; the virtualized list re-renders only the affected rows, not the whole board.

---

# PART 5 — Frontend Architecture

## Folder Structure

```
src/
  board-shell/           // nav, board switcher, filters
  features/
    board-view/           // list/card rendering, virtualization
    drag-drop/             // pointer + keyboard move engine
    card-detail/            // description, checklist, comments, attachments
    automation/              // Butler-style rule builder
    power-ups/                // sandboxed integration runtime
  shared/
    data/                    // normalized store, position-key logic, sync engine
    ui/
    persistence/              // IndexedDB-backed offline cache
```

## Component Architecture

- **Drag-and-drop is a dedicated, isolated module** consumed by the board view, not entangled with card-detail or comment logic — its only contract is "given a drag gesture, produce a committed move event."
- **Card rows are pure, memoized presentational components** keyed by card ID + a version/position token, so a remote update to one card never re-renders unrelated cards.

## State Management

- **Position keys, not array indices**, are the canonical representation of card order — this is the single most important state-management decision in this design (see Part 12 for the full trade-off).
- Drag-in-progress state (which card is being dragged, current pointer position) is purely ephemeral, local UI state — never written to the shared/normalized store until the drag commits.

## Data Fetching

- Boards load with their full list/card structure but **lazy-load card detail** (description, comments, attachments) only when a card is opened — the board view itself only needs title, labels, due date, and member avatars.
- Very long lists paginate/lazy-load further cards as the user scrolls, rather than fetching the entire list upfront.

## Caching Strategy

- IndexedDB caches the current board state for instant reopen and offline access; stale-while-revalidate reconciles with the realtime service's current state on (re)connect.

## Error Handling

- A rejected move (e.g., permission revoked mid-drag, list deleted by another user concurrently) triggers a clear, localized rollback animation of just that card back to a valid position, with a brief explanatory toast — never a full-board reload.

## Retry Strategy

- Move/edit events carry an idempotency key; failed sends retry with backoff, and a card move is never silently dropped — it either succeeds, is explicitly rolled back, or remains visibly "pending sync."

## Loading States

- Skeleton lists/cards on first board load, matching real dimensions to avoid layout shift; a subtle per-card "syncing" indicator for actions still in flight.

## Feature Flags

- New drag-and-drop interaction changes (a frequently-used, high-visibility interaction) roll out behind tightly-scoped percentage flags with an easy kill switch.

## Analytics Integration

- Track drag-start-to-drop duration, move-commit success rate, and time-to-first-board-render as the key health signals for this product's core interaction loop.

---

# PART 6 — Performance Engineering

## Initial Load Optimization

- Render the board shell and list headers immediately; stream in card content per list, prioritizing the lists currently in or near the viewport.

## Bundle Splitting

- Drag-and-drop engine, card-detail modal, automation/rule-builder, and power-up sandbox runtime are all separately loadable chunks, since a given board session may never touch automation or power-ups at all.

## Lazy Loading

- Attachments, comment threads, and activity history load only when a card is opened, not as part of the base board payload.

## Prefetching

- Prefetch a card's full detail on hover/focus-intent, similar to the Gmail thread-prefetch pattern, so opening it feels instant.

## Virtualization

- **Two-axis virtualization**: horizontally, only lists near the visible viewport are fully mounted; vertically, within each mounted list, only nearby cards are rendered, with placeholders sized to match real card height to avoid scroll-position jumps.
- This is harder than single-axis list virtualization because horizontal scroll position and each list's independent vertical scroll position both need to be preserved correctly as the user pans around a large board.

## Memoization

- Memoize card rows by ID + position/version so a drag or edit on one card never re-renders the rest of the board.

## Rendering Optimization

- During an active drag, avoid any React-style full re-render cycle for the dragged element — track and render its position via direct, imperative style updates (e.g., transform) for maximum frame-rate stability, reconciling with the framework's state only once the drag commits.

## API Optimization

- Batch multiple rapid card edits (e.g., typing in a card title) with debounced persistence rather than one request per keystroke.

## Browser Optimization

- Use the Pointer Events API (not separate mouse/touch handlers) for unified, lower-overhead drag tracking; use `will-change: transform` only on the actively-dragged card, not the whole board.

---

# PART 7 — Scalability

| Scale | Architecture Characteristics | Primary Bottlenecks | Mitigations |
|---|---|---|---|
| 10K users | Single realtime service instance, simple integer or basic fractional ordering, REST + polling acceptable | Minimal; focus on correctness over scale | Basic WebSocket or even short-interval polling for updates |
| 100K users | Dedicated realtime/coordination service, fractional ordering keys adopted to avoid reindex storms | Hot boards with high edit frequency causing position-key precision decay | Periodic position-key rebalancing job; per-board rate limiting |
| 1M users | Realtime service sharded by board ID, virtualization mandatory for large boards, power-up sandbox formalized | Large boards (tens of thousands of cards) stressing initial load and virtualization; popular boards creating hot shards | Lazy/paginated list loading; consistent-hash sharding by board ID; isolate exceptionally large/active boards |
| 100M+ users | Multi-region realtime infra, dedicated team owning the board-rendering/virtualization engine as an internal platform, formal power-up marketplace with review/sandboxing pipeline | Cross-region latency for distributed teams on the same board; ecosystem risk from a large volume of third-party power-ups | Region-affinity per board/workspace; rigorous power-up sandboxing and a vetted capability/permission model; dedicated platform team for the rendering engine |

## Bottlenecks and Solutions, Explained

- The **ordering-key data model** is the single decision with the most leverage on scalability here — get it wrong (array indices requiring mass renumbering) and every other optimization is fighting an avoidable problem.
- At very large scale, the long tail of **unusually large or unusually active boards** (a company-wide engineering backlog with thousands of cards and constant activity) is the real stress test, not the median board — isolation/sharding strategy should be designed around that tail, similar to the high-concurrency-document pattern in collaborative editors.

---

# PART 8 — Accessibility

## WCAG Compliance

- WCAG 2.1 AA baseline, with particular scrutiny on the drag-and-drop interaction, which is historically one of the most commonly *failed* accessibility patterns in web products.

## Keyboard Navigation

- Every card must be reachable, selectable, and movable entirely via keyboard: a typical pattern is selecting a card, entering a "move mode" (announced to assistive tech), using arrow keys to choose a new position/list, and confirming — without ever requiring a pointer.

## Screen Readers

- After any move (mouse, keyboard, or remote), announce the card's new position and list via an ARIA live region ("Card moved to position 3 of 8 in 'In Progress'").

## ARIA Strategy

- Model lists and cards with appropriate roles (e.g., list/listitem semantics or a grid pattern) and use `aria-grabbed`/equivalent state communication during an active keyboard-move operation so assistive technology users understand the interaction is in progress.

## Focus Management

- After completing a move (by any input method), focus remains on the moved card in its new position — never lost to the top of the page or back to a default location.

## Enterprise Accessibility Requirements

- Government and education customers (a real Workspace-style segment for project-management tools) often require an audited, fully keyboard-operable alternative to drag-and-drop as a contractual accessibility requirement, not just a best practice.

---

# PART 9 — Security

## Authentication

- Standard OAuth2/SSO; workspace-level identity federation for enterprise customers.

## Authorization

- Board-level visibility (private/workspace/public) and role-based permissions (admin/member/observer/guest) enforced on every read and write, including realtime events — a permission downgrade must immediately stop a user's client from receiving or sending further board events.

## Session Management

- Standard secure session cookies; realtime WebSocket connections re-validate authorization periodically, not just at connect time.

## XSS Protection

- Card titles, descriptions, and comments are user-generated rich text — sanitize before render, and never allow attached/embedded content (e.g., a pasted link preview) to execute script in the host page's context.

## CSRF Protection

- Standard CSRF tokens on state-changing REST endpoints; WebSocket events authenticated via the connection's session, not per-message tokens.

## Clickjacking Protection

- Standard frame-ancestors restrictions on the core app; power-up iframes are a deliberately separate, tightly sandboxed exception with a narrow permitted API surface.

## Sensitive Data Handling

- Attachment URLs are scoped and time-limited rather than permanently public; power-ups only receive the specific board/card data they've been explicitly granted access to, not a blanket data feed.

---

# PART 10 — Offline Support

## Service Workers

- Cache the app shell for offline launch; queue outbound card moves/edits in a background sync queue when offline.

## Local Storage Usage

- Reserved for small preferences only (e.g., last-viewed board); not used for board/card content.

## IndexedDB

- Stores the current board state (lists, cards, position keys) and the pending-write queue, enabling full offline viewing and queued editing of a previously-loaded board.

## Synchronization Strategy

- On reconnect, the client sends its queued moves/edits to the realtime service, which validates and reconciles each against whatever happened on the board while offline, then returns the authoritative resulting state.

## Conflict Resolution

- Because card order is represented as a **position key** rather than an index, two users moving different cards while offline merge cleanly in most cases — each move only specifies a desired relative position, not a full reordering of the list.
- The genuine conflict case is **two users moving the same card to different places** while both offline; this resolves via last-write-wins on that specific card's position (using server-assigned timestamps), with the "losing" user's client reconciling to the authoritative state and surfacing a brief notice rather than silently overwriting their view.

---

# PART 11 — Monitoring

## Logging

- Structured client logs of move/edit attempts and outcomes, correlated by board ID and session ID.

## Metrics

- Move-commit latency and success rate, board-open-to-interactive time, and drag-frame-rate (dropped frames during active drags) are the product-specific health signals, alongside standard Core Web Vitals.

## Error Tracking

- Elevated severity for any error indicating a card move was accepted locally but rejected/reverted by the server, since a pattern of these indicates either a client-side bug or a position-key collision problem worth investigating.

## User Monitoring

- RUM segmented by board size (card count) and list count, since both materially affect virtualization and rendering performance in ways aggregate metrics would hide.

## Performance Monitoring

- Synthetic tests simulating drag interactions on boards of varying size, specifically tracking frame rate during the drag and move-commit latency after drop.

---

# PART 12 — Trade-Off Analysis

## Fractional/Lexicographic Position Keys vs. Integer Array Indices

- **Why choose fractional/lexicographic keys**: moving a card only requires computing and writing a single new key for that card (e.g., a value that sorts between its new neighbors) — no other card's data changes.
- **Alternative**: a plain integer index per card within its list, requiring every subsequent card to be renumbered on each insert/move.
- **Pros of position keys**: O(1) writes per move regardless of list length; merges cleanly across offline/concurrent edits since moves don't depend on the full list state.
- **Cons**: key precision can degrade after many moves clustered in the same spot (e.g., repeatedly inserting between the same two cards), requiring an occasional rebalancing/compaction pass; slightly more complex to reason about than a simple index.
- **When not to use it**: a list that's never reordered by users (e.g., a strictly chronological, append-only log) doesn't need this complexity — a simple timestamp or auto-increment ID is sufficient.

## Custom Drag-and-Drop Engine vs. Third-Party Library

- **Why build custom**: full control over frame-rate-critical pointer tracking, exact integration with two-axis virtualization, and tailored keyboard-accessible move mode.
- **Alternative**: a mature library (e.g., `dnd-kit`-style solutions).
- **Pros of custom**: no unused feature weight, precise performance tuning for this specific virtualization model.
- **Cons**: significant engineering investment, and accessibility/touch-device edge cases that mature libraries have already solved through years of real-world hardening.
- **When not to use custom**: most teams should default to a proven library unless their virtualization or performance requirements are genuinely unusual — drag-and-drop has enough subtle edge cases (touch, accessibility, nested scrollable regions) that reinventing it is rarely the best use of engineering time.

## Optimistic Local Reorder vs. Wait-for-Server-Confirmation

- **Why choose optimistic**: the drag interaction itself is already fully local; extending optimism to the post-drop persisted state keeps the experience consistently instant rather than introducing a jarring pause right after the satisfying part of the interaction.
- **Alternative**: show the card in its old position (or a loading state) until the server confirms the move.
- **Pros of optimistic**: dramatically better perceived performance for the single most frequent interaction in the product.
- **Cons**: requires a clean, well-tested rollback path for the rejected-move case.
- **When not to use it**: an action with serious, hard-to-reverse consequences (e.g., permanently deleting a board) should use explicit confirmation rather than optimism — but ordinary card moves are low-stakes and reversible, making optimism the right default here.

## WebSocket Push vs. Polling for Board Updates

- **Why choose push**: near-instant propagation of teammates' changes, which is core to the "feels like a shared physical board" experience.
- **Alternative**: short-interval polling.
- **Pros of push**: better experience, lower request volume at scale for actively-collaborated boards.
- **Cons**: connection-management complexity; less valuable for boards that are rarely viewed concurrently by multiple people.
- **When not to use push**: a personal, single-user board genuinely doesn't need a live push connection — some products selectively downgrade to polling or on-focus refresh for boards with no other recent viewers, as a cost optimization.

---

# PART 13 — Follow-Up Questions

1. **How do you avoid renumbering every card when one card moves?** Use fractional/lexicographic position keys so a move only writes the moved card's new key, not its neighbors'.
2. **What happens when position-key precision runs out (e.g., a string can't be made any more precise between two existing keys)?** A periodic rebalancing job recomputes evenly-spaced keys for the affected list in the background, transparently to the user.
3. **How do you keep dragging at 60fps even on a board with thousands of cards?** The drag interaction is rendered imperatively (direct style/transform updates) independent of the virtualization/re-render cycle, and only the dragged card's layer needs to update each frame.
4. **How would you implement the keyboard-accessible equivalent of drag-and-drop?** A "move" mode entered via keyboard that lets the user choose a target list/position with arrow keys and confirm, with ARIA live announcements at each step.
5. **What happens if two users drag the same card to different lists at the same time?** The realtime service resolves it with a final authoritative position (typically last-write-wins by server timestamp), and the "losing" client reconciles its view and gets a brief notice rather than silently keeping a stale position.
6. **How do you virtualize a board with many long lists without losing scroll position when panning around?** Track each list's scroll offset independently and only mount/unmount card rows within each list's own visible window, while keeping placeholder heights stable to avoid jumps.
7. **How would you support undo for a card move?** Since the move is represented as a position-key change, undo simply re-applies the card's previous key as a new move — same code path as any other move, not a special case.
8. **How do you prevent a malicious power-up from reading data from boards it shouldn't access?** Run power-ups in a sandboxed context (e.g., a scoped iframe) with an explicit, narrow permission grant per board/workspace, never blanket access.
9. **What's your approach to very large attachments on cards?** Chunked/resumable upload to dedicated blob storage, decoupled from the card-edit path, with the card referencing the resulting scoped, time-limited URL.
10. **How would you handle a card being deleted by one user while another is mid-drag on it?** The drag is purely local until commit; on commit, the server rejects the move (the card no longer exists) and the client cleanly removes the card from view with a brief explanation rather than erroring.
11. **How do you keep the activity log from becoming a performance burden on the card detail view?** Paginate/lazy-load activity history, fetched only when the user opens that section of the card detail, not as part of the base card payload.
12. **What telemetry would reveal that a board-view redesign hurt drag performance?** A regression in measured drag frame-rate or move-commit latency, segmented by board size, would be the direct signal — generic page-load metrics wouldn't necessarily catch it.
13. **How would you support copying an entire board as a template?** Treat it as a bulk, asynchronous operation server-side (cloning lists/cards/position keys) with the frontend showing progress rather than blocking on a single large synchronous request.
14. **How do you avoid the whole board re-rendering when a single remote card edit arrives?** Memoize card rows by ID + version and route the update through the normalized store so only the affected card's subscribers re-render.
15. **What's the right granularity for "syncing" indicators during card edits?** Per-card, subtle, and non-blocking — the user should be able to keep editing other cards while one card's change is still persisting in the background.

---

# PART 14 — Staff Engineer Deep Dive

## Architectural Evolution

- Early-stage versions of this kind of product often start with simple integer ordering and full-board polling refresh; the move to fractional position keys and realtime push typically happens once boards and concurrent usage grow enough that renumbering and refresh-latency become visibly painful — a staff engineer should frame this as a deliberate, scale-triggered evolution rather than something that should have been "done right" from day one regardless of actual need.

## Long-Term Maintainability

- The position-key scheme and the virtualization engine are the two pieces of infrastructure that every feature team (card detail, automation, power-ups) implicitly depends on; changes to either require careful, broadly-tested rollout given how widely they're relied upon.

## Team Scalability

- Clear ownership: a Board/Core team owns rendering, virtualization, and the ordering model; a Card-Detail team owns the card modal and its sub-features (comments, attachments, checklists); an Automation/Power-Ups team owns the sandboxed extensibility surface.

## Platform Strategy

- The power-up sandbox is itself a small internal platform — a stable, documented, permissioned API that lets a large ecosystem of integrations exist without each one being a stability or security risk to the core product.

## Technical Debt Management

- Position-key rebalancing jobs and any change to the ordering scheme are treated with the same caution as a data-migration, since a bug here can visibly scramble the order of a customer's board — a highly visible, trust-damaging class of failure.

## Migration Strategy

- Moving from an older ordering scheme (e.g., integer indices) to fractional keys in a live system requires a careful dual-write/backfill period, since boards are actively being edited by users throughout the migration and cannot be taken offline for it.

---

# PART 15 — Production Reality

## What Most Companies Actually Do

- Most real systems converge on some form of **fractional/lexicographic ordering** for exactly this kind of draggable-list product — it's one of the most consistently rediscovered patterns in this problem space because the integer-reindex alternative fails so quickly in practice.
- Many teams use a mature drag-and-drop library rather than building one from scratch, reserving custom engineering effort for the virtualization integration and the keyboard-accessible move mode, which tend to be the genuinely product-specific hard parts.

## Common Anti-Patterns

- Storing card order as an array index and updating "just a few" surrounding cards on each move — works until a board gets busy enough that this becomes a measurable, then a severe, performance and consistency problem.
- Treating accessibility for drag-and-drop as something to retrofit later — it's consistently more expensive and less complete when added after the core interaction has already shipped and been depended on.
- Re-fetching the entire board on any remote change instead of applying the specific delta — wastes bandwidth and causes visible, jarring full-board re-renders.

## Lessons Learned

- **Perceived drag smoothness matters more to user satisfaction than almost any other single metric** in this product category — a board that's slightly slower to load but butter-smooth to drag on will out-perform the reverse in user sentiment.
- Position-key precision decay is a real, recurring maintenance item, not a one-time design decision — teams that don't plan for periodic rebalancing eventually have to do it reactively, under pressure, on a customer's live board.

## Real-World Failure Patterns

- **Visible card-order corruption** (cards appearing in the wrong order after a sync issue) is one of the most trust-damaging bug classes in this product, precisely because it's so visually obvious to the user — it tends to get prioritized and fixed faster than almost any other bug class for that reason.
- **Power-up/integration incidents** (a buggy or overly-permissioned integration causing unexpected board changes) are a recurring real-world failure mode that motivates investment in sandboxing and explicit, auditable permission grants rather than ambient trust.

---

# PART 16 — Interview Summary

## 5-Minute Answer

"The core insight is that card order should be a position key, not an array index — something like a fractional or lexicographic value that sorts between its neighbors — so moving a card only ever writes that one card's new key, never reindexing the rest of the list. The drag interaction itself is fully local and immediate, tracked imperatively for frame-rate stability; only on drop does the client compute a new key and send a single move event to a realtime coordination service, which validates it, resolves any concurrent-move conflicts, and broadcasts the result to other clients. The board view is virtualized along two axes — which lists are mounted, and within each, which cards are mounted — since boards can have many long lists simultaneously. And critically, every drag interaction needs a fully keyboard-accessible equivalent, since drag-and-drop is one of the most commonly failed accessibility patterns on the web."

## 15-Minute Answer

Extend with: the full architecture (board shell, virtualized list/card renderer, drag engine, normalized store with position keys, realtime coordination service, durable store, activity log, power-up sandbox); the data-flow walkthrough for a drag-and-drop move including conflict resolution; the offline/IndexedDB strategy and why position keys merge more gracefully than index-based ordering under concurrent/offline edits; and at least two explicit trade-offs — fractional keys vs. integer indices, and optimistic local reorder vs. wait-for-confirmation — stated with their specific failure modes and mitigations (key-precision rebalancing; rollback UX).

## 30-Minute Deep Dive

Cover everything above, plus: the full scalability progression and why the ordering-key decision is the single highest-leverage scalability choice in this design; the accessibility deep dive on the keyboard-move mode and live-region announcements; the security model for board permissions and power-up sandboxing; the monitoring strategy centered on drag-frame-rate and move-commit success rate as the product's defining health signals; and a staff-level closing on team ownership (Board/Core, Card-Detail, Automation/Power-Ups), the power-up sandbox as an internal platform, and how production reality (most teams converging on fractional ordering, treating drag-and-drop libraries as a default rather than building custom, and the recurring need for position-key rebalancing) shapes this from a textbook design into something a real team operates safely for years.
