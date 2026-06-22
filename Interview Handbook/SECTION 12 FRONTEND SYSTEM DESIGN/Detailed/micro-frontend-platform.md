# PART 1 — Problem Statement

## Business Requirements

- Micro-frontends exist to solve an **organizational scaling problem**, not primarily a technical one: once an org has dozens of teams contributing to one frontend, a single monolithic codebase and deployment pipeline becomes a coordination bottleneck — merge conflicts, shared release trains, and one team's bug blocking everyone else's deploy.
- The business goal is **team autonomy and independent delivery cadence** — each team should be able to build, test, and ship its part of the product without waiting on or being blocked by other teams, while end users still experience one cohesive product.
- This is a deliberate trade: real technical complexity and some performance overhead are accepted in exchange for organizational scalability — a staff-level design should be explicit that this is a trade, not a free upgrade.

## Functional Requirements

- A **host/shell application** that composes multiple independently-built and independently-deployed **micro-frontends (remotes)** into one user-facing experience.
- **Seamless cross-MFE navigation**: moving between sections owned by different teams should feel like one app, not a series of full page reloads or visibly disjointed experiences.
- **Shared cross-cutting concerns** — authentication/session context, the design system, global navigation chrome — provided consistently across every MFE, owned centrally rather than reimplemented per team.
- **Independent deployability**: a team can deploy a new version of its MFE without requiring a host redeploy or coordinating with other teams' release schedules.
- **Failure isolation**: a bug or crash in one MFE should not take down the rest of the page.

## Non-Functional Requirements

- **No duplicated heavy shared dependencies**: the architecture must avoid every MFE shipping its own full copy of React (or an equivalent framework), which would otherwise multiply page weight by the number of MFEs on a page.
- **Acceptable page performance** despite composing many separately-built bundles — the end-user experience should be comparable to a well-built monolith, not visibly worse.
- **Version compatibility management** between the host and however many independently-versioned remotes it composes, including graceful handling of a remote being temporarily unavailable or incompatible.
- **Independent deploy cadence per team**, without requiring synchronized release trains.

## User Scale Assumptions

- Organizationally: anywhere from a handful of teams (where micro-frontends are often premature) to dozens or hundreds of teams in a large enterprise, each owning one or more MFEs.
- End-user scale is whatever the underlying product's scale is — this architectural pattern is most associated with large consumer or enterprise products (e.g., a major retailer's site, where checkout, product browsing, and account management might each be owned by different teams) serving potentially millions of users, who should never be aware of the underlying team boundaries.

## Performance Expectations

- Minimize duplicate framework/library download across MFEs via a shared dependency scope.
- Lazy-load MFEs not needed for the current route; avoid paying the cost of every team's MFE on every page load.
- Total composed page weight and interactivity should be in the same ballpark as an equivalent monolithic implementation — measurable performance regression is a real risk this architecture must actively guard against.

## Accessibility Requirements

- Focus management and consistent landmark/heading structure must hold up **across MFE boundaries** — a user tabbing through the page or using a screen reader shouldn't be able to tell where one team's code ends and another's begins.
- Skip links and other navigation aids must work correctly even though the underlying DOM is assembled from independently-built pieces.

## Security Requirements

- **Content Security Policy** must explicitly allow loading remote bundles from each team's trusted origin, and that allowlist itself becomes a piece of infrastructure to maintain as teams are added or removed.
- **Trust boundaries between MFEs** matter: same-document composition (most Module Federation setups) means MFEs share a JavaScript realm and DOM, so a vulnerability in one MFE can, in principle, affect others — a real architectural weakness to weigh against the alternative (iframe-based isolation, which trades this risk for UX/integration friction).
- **Shared authentication/session handling** must be done by the host in a way that doesn't require every remote to handle raw credentials independently and inconsistently.

---

# PART 2 — Interviewer's Expectations

## What Interviewers Evaluate

- Does the candidate understand that micro-frontends are primarily an **organizational/team-scaling tool**, and can they articulate the real technical costs (complexity, performance overhead, harder debugging) honestly rather than presenting this as strictly better than a well-architected monolith?
- Can they design a credible **shared-dependency strategy** that avoids loading the same framework multiple times across composed MFEs?
- Do they design **cross-MFE communication** that's loosely coupled (a stable, minimal contract) rather than remotes reaching into each other's or the host's internals?
- Do they address **failure isolation and independent deployability** concretely — not just naming "Module Federation" as the answer, but explaining how versioning, fallback, and error boundaries actually work?

## Common Mistakes

- Treating this as a bundler-trivia question ("how does Webpack Module Federation work") without addressing the organizational motivation or the broader system design at all.
- Presenting micro-frontends as an unconditionally good architecture, never discussing when a well-modularized monolith is the better choice.
- No discussion of how the same shared library version is negotiated/de-duplicated across independently-built remotes.
- No failure-isolation strategy — assuming all composed MFEs will always load and render successfully.

## Red Flags

- Each MFE bundling its own complete copy of React (or equivalent) with no shared/singleton dependency strategy — an immediate, severe performance problem at any real scale.
- No clearly defined ownership boundary for routing — host and remotes both trying to own overlapping route logic, leading to conflicts and confusion about which team is responsible for what.
- Assuming MFEs can be built in total isolation with zero contract or coordination between teams — in practice, *something* (shared auth, design tokens, a minimal event contract) always needs to be agreed upon.
- Presenting iframe-based isolation as the single, obvious answer without acknowledging its real UX costs (broken shared scroll, harder cross-frame interaction, separate accessibility trees).

## Strong Signals

- Explains **Module Federation's shared scope and singleton flag** (or the equivalent concept in whatever federation mechanism is chosen) as the mechanism that prevents duplicate framework instances across remotes.
- Describes a **contract-first integration model**: a stable, versioned interface between host and remotes covering routing ownership, shared context/props, and design tokens — letting teams deploy independently as long as they honor the contract.
- Proposes **per-MFE error boundaries** at each mount point, with a defined fallback UI, so one remote's failure is contained.
- Compares multiple integration patterns — **runtime composition** (Module Federation), **build-time composition** (each MFE published as an npm package, composed at the host's build step), and **server-side/edge composition** (assembling HTML fragments at the edge) — and discusses when each is appropriate.

## Staff-Level Signals

- Is explicit that micro-frontends trade **real technical cost for organizational benefit**, and frames the decision to adopt them as scale-dependent — not appropriate for every team size.
- Discusses **governance for shared dependency version upgrades** across many teams as a problem structurally similar to design-system versioning — requiring the same kind of deprecation windows and migration tooling.
- Proposes an **incremental migration strategy** (strangler fig) from an existing monolith, rather than assuming a greenfield build.
- Connects MFE boundaries explicitly to **team topology and Conway's Law** — the boundaries should follow real business-domain/team ownership lines, not an arbitrary technical split that doesn't match how the organization actually works.

---

# PART 3 — Requirement Gathering

- How many teams/MFEs are we actually designing for — is this justified at the organization's current scale, or are we evaluating whether micro-frontends are appropriate at all?
- Is this a greenfield build, or are we incrementally extracting micro-frontends from an existing monolith?
- What's the framework situation — is every team using the same framework/version, or do we need to support framework heterogeneity (e.g., one team on React, another on Vue)?
- Do we need true independent deployability (a team ships without any host involvement), or is a coordinated-but-separate release process acceptable?
- What's our tolerance for shared-dependency version drift — must every remote use the exact same React version as the host, or can we support a negotiated range?
- Is failure isolation a hard requirement (one MFE's crash must never affect others), or is some coupling acceptable given the org's risk tolerance?
- Do we need cross-MFE communication (shared state, event-based messaging), or are the MFEs largely independent, route-isolated experiences?
- What's the trust level between teams/MFEs — are all teams equally trusted internal teams, or could some MFEs be from less-trusted internal groups or even third parties?
- Should routing be entirely owned by the host, or do individual remotes own sub-routes within their own domain?
- Do we need to support server-side rendering of the composed page, or is this a client-side-only composition?
- What's the expected page weight/performance budget, and how do we attribute performance regressions to the specific team/MFE responsible?
- How should design system and accessibility consistency be enforced across independently-built MFEs?
- What's our rollback strategy if a newly deployed remote breaks the host or another remote?
- Should this design account for the host itself evolving (e.g., a host redeploy), and how do we ensure that doesn't require simultaneous remote redeploys?

---

# PART 4 — High-Level Architecture

## Architecture Diagram (ASCII)

```
              ┌───────────────────────────────────────────────────────────┐
              │ Host / Shell App                                          │
              │ top-level routing · shared chrome · auth/session context  │
              │ shared dependency scope (React singleton) · design system │
              └───────────────────────────────────────────────────────────┘
                                             ▼
        ┌────────────────────────────────────────────────────────────────────────┐
        │ Event Bus / Shared State (minimal, contract-based cross-MFE messaging) │
        └────────────────────────────────────────────────────────────────────────┘
                                             ▼
                ┌────────────────────────────────────────────────────────┐
                │ Runtime Remote Manifest Resolution (Module Federation) │
                └────────────────────────────────────────────────────────┘
                                             ▼
                ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
                │ Remote MFE A  │   │ Remote MFE B  │   │ Remote MFE N  │
                │ (Team A repo, │   │ (Team B repo, │   │ (Team N repo, │
                │ own CI/CD)    │   │ own CI/CD)    │   │ own CI/CD)    │
                └───────────────┘   └───────────────┘   └───────────────┘
                                             ▼
                  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
                  │ Team A CDN / │   │ Team B CDN / │   │ Team N CDN / │
                  │ remote entry │   │ remote entry │   │ remote entry │
                  └──────────────┘   └──────────────┘   └──────────────┘
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Independent CI/CD pipeline per team — deploy without redeploying host or other remotes │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

- **Host/shell app**: owns top-level routing, shared navigation chrome, the authentication/session context provided to every remote, and the shared dependency scope (a single, de-duplicated copy of the framework and other heavy shared libraries).
- **Event bus/shared state**: a deliberately minimal, explicitly-contracted channel for the rare cases where MFEs genuinely need to communicate (e.g., a cart-count update affecting both a product MFE and a header MFE) — not a free-for-all shared global store.
- **Runtime remote manifest resolution**: the mechanism (Module Federation or equivalent) by which the host discovers, at runtime, where to fetch each remote's current deployed version from.
- **Remote MFEs**: each owned end-to-end by one team, with its own repository, build pipeline, and deployment target, implementing one or more routes/features within the overall product.
- **Independent CI/CD per team**: the organizational payoff of this entire architecture — a team can ship a change to its own remote entry point without coordinating a host redeploy or a synchronized release with other teams.

## Frontend Layers

1. **Shell layer** — routing ownership, shared chrome, cross-cutting context providers.
2. **Federation/composition layer** — runtime (or build-time) resolution and loading of remote modules.
3. **Remote/feature layer** — each team's independently-owned implementation.
4. **Shared contract layer** — the design system, the minimal event/state contract, and the shared-dependency scope, which is the thin but critical connective tissue between all of the above.

## Backend Dependencies

- Each remote typically calls its own backend APIs directly (or through a BFF it owns), independent of other remotes' backend dependencies.
- A shared identity/auth service the host integrates with once and passes context down from, rather than each remote independently implementing authentication.

## Data Flow

- **Page load**: the host loads first, establishes auth/session context and the shared dependency scope, determines the current route, and resolves which remote(s) are needed for that route via the federation manifest, then fetches and mounts them.
- **Navigation between MFE-owned routes**: the host's router determines the target remote, lazy-loads it if not already loaded, and mounts it into the appropriate slot — ideally without a full page reload, preserving the single-page-app feel even though the code crossing that boundary was built and deployed by a different team entirely.
- **Cross-MFE event** (e.g., adding to cart): the originating MFE publishes an event on the shared, contracted event bus; any other MFE that's subscribed (e.g., a header cart-count indicator owned by a different team) reacts independently — neither MFE has a direct reference to the other's internals.

---

# PART 5 — Frontend Architecture

## Folder/Repo Structure

```
host-shell/              // separate repo: routing, shared chrome, auth context,
                          // shared-dependency scope configuration
mfe-team-a/                // separate repo: Team A's owned routes/features
mfe-team-b/                  // separate repo: Team B's owned routes/features
mfe-team-n/                    // separate repo: Team N's owned routes/features
shared-contracts/                // versioned package: event names/payloads,
                                  // shared TypeScript types for the host-remote contract
```

- Polyrepo (one repository per team/MFE) is common specifically *because* independent deployability is the point — a monorepo can still support this with independent package-level deploy pipelines, but the repo structure should reflect and reinforce the team-ownership boundary either way.

## Component Architecture

- The **host owns the outer shell and routing decisions**; each remote owns everything within its own mounted region, including its own internal component structure, which other teams should never need to know about or depend on directly.
- Communication crosses the host-remote boundary only through the **explicitly versioned shared contract** (props/context the host provides, events on the shared bus) — never through a remote reaching into the host's internals or another remote's internals directly.

## State Management

- **Minimal shared global state**, deliberately: auth/session/user context provided by the host, perhaps a small set of cross-cutting concerns (locale, feature flags) — everything else is local to the owning MFE.
- Avoid the temptation to build a large shared state store "for convenience" — it quietly recreates tight coupling between teams that the whole architecture exists to avoid.

## Data Fetching

- Each MFE fetches its own data independently from its own backend dependencies; there's no requirement for a shared client-side data layer across MFEs, though a shared, thin API client utility (handling auth token attachment, for instance) is a reasonable shared library.

## Caching Strategy

- Each MFE manages its own data caching independently; the host may cache the **remote manifest/version resolution** itself briefly, with a short TTL, to balance picking up new deployments promptly against not re-resolving on every single navigation.

## Error Handling

- **Per-MFE error boundaries** at each mount point: if a remote fails to load or throws during render, the host shows a contained, well-designed fallback for just that region — the rest of the page (and other MFEs) continue functioning normally.

## Retry Strategy

- If a remote fails to load (network failure, a bad deploy), the host retries with backoff and can fall back to a previously cached-working version of that remote if one is available, rather than only ever trying the absolute latest.

## Loading States

- Each MFE's mount point shows its own loading placeholder while its bundle loads and its own data fetches resolve — consistent with the overall principle that each region's lifecycle is independent of the others.

## Feature Flags

- The host's remote-resolution layer can itself be flag-driven — e.g., canarying a new version of Team A's remote to a percentage of users while the rest continue on the previous version, entirely independent of any other team's deploy.

## Analytics Integration

- A **unified analytics event schema** is owned centrally (similar to a design-system-style shared contract), while each MFE is responsible for firing its own events tagged with enough context to attribute them back to the correct team/feature — this balances team independence with the organization's need for a coherent, cross-product analytics picture.

---

# PART 6 — Performance Engineering

## Initial Load Optimization

- The host loads first and establishes the shared dependency scope and auth context before resolving and loading whichever remote(s) the current route actually needs — minimizing what has to happen before the first meaningful MFE can start rendering.

## Bundle Splitting

- This is the architecture's defining performance concern: a **shared dependency scope with singleton flags** (so the host and all remotes negotiate to use one shared copy of React, or whatever the heavy shared library is) is what prevents page weight from multiplying by the number of composed MFEs.

## Lazy Loading

- Remotes not needed for the current route are never fetched at all; route-based lazy loading of MFEs is the default, not an afterthought.

## Prefetching

- If navigation to a specific other MFE is highly likely (e.g., a prominent "go to checkout" action), prefetch that remote's bundle on hover/focus-intent, the same pattern used for prefetching within a single-team app.

## Virtualization

- Not a primary concern at the composition layer itself; individual MFEs apply virtualization internally for their own large lists/tables exactly as they would in a non-federated app.

## Memoization

- Scoped within each MFE's own rendering logic; there's no special cross-MFE memoization concern beyond normal good practice within each team's codebase.

## Rendering Optimization

- Avoid **double-mounting or double-initializing the shared framework** — this is exactly what the singleton shared-dependency configuration is meant to prevent, and a misconfiguration here is one of the most common, performance-damaging mistakes in real Module Federation setups.
- Minimize layout thrash when swapping which MFE occupies a given region during client-side navigation, by reserving stable layout space ahead of the incoming remote's render.

## API Optimization

- Each MFE makes its own API calls independently; if there's a real need for cross-MFE data aggregation (e.g., a dashboard combining data multiple teams own), that's better solved with a BFF aggregation layer than by tightly coupling MFEs to fetch and share each other's data directly.

## Browser Optimization

- Use `preconnect`/`dns-prefetch` hints for known remote CDN origins to shave connection-setup latency off the first load of each remote; prioritize the critical, above-the-fold MFE's resource loading over less time-sensitive ones.

---

# PART 7 — Scalability

| Scale | Architecture Characteristics | Primary Bottlenecks | Mitigations |
|---|---|---|---|
| 2–5 teams / MFEs | Often premature for full runtime federation; a well-modularized monolith may genuinely be the better choice at this scale | The added complexity of federation itself, relative to the actual coordination pain being solved | Seriously evaluate whether a modular monolith with clear internal ownership boundaries solves the real problem with far less complexity |
| 5–20 teams / MFEs | Module Federation (or equivalent) introduced; shared-dependency governance and a basic host-remote contract formalized | Shared dependency version drift starting to cause friction; routing-ownership ambiguity between host and remotes | Clear, documented contract (routing boundaries, shared context, shared dependency version ranges); lightweight governance for contract changes |
| 20–100 teams / MFEs | Dedicated platform team owns the shell, shared-dependency scope, and contract; canary/feature-flagged remote rollout becomes standard | Debugging issues that span MFE boundaries becomes genuinely harder; performance regressions hard to attribute to a specific team without good tooling | Per-MFE performance and error monitoring with clear team attribution; strong CI checks on shared-dependency compatibility before a remote can deploy |
| 100+ teams / MFEs | Formal governance tiers for contract changes, sophisticated canary/rollback tooling, dedicated platform investment comparable to a design-system team's scale | Organizational coordination overhead on any shared-contract change; risk of the shared dependency scope itself becoming a bottleneck for upgrades | Strict versioning and deprecation discipline on the shared contract (structurally similar to design-system governance); strong automated compatibility testing across the whole federation before any shared-dependency upgrade ships broadly |

## Bottlenecks and Solutions, Explained

- The single most important scaling insight here is that **micro-frontends have a real complexity cost that only pays for itself past a certain organizational scale** — at the low end of the table, a team proposing full runtime federation should be asked to justify it against a simpler modular-monolith alternative.
- As the number of MFEs grows, the **shared contract (routing boundaries, shared dependency versions, the event/state contract)** becomes the dominant scaling lever, in much the same way the token/component contract is the dominant lever in a design system — and for the same reason: it's the one piece of shared infrastructure every team depends on.

---

# PART 8 — Accessibility

## WCAG Compliance

- WCAG 2.1 AA baseline applies to the **composed experience as a whole**, not just each MFE in isolation — a page can have every individual MFE pass its own accessibility tests and still fail as a composed whole if, for example, heading levels or landmark structure don't make sense across the boundary.

## Keyboard Navigation

- Tab order and focus must flow sensibly across MFE boundaries — a user tabbing through the page shouldn't experience a jarring jump or a region that's unexpectedly unreachable because of how two independently-built MFEs happened to be assembled.

## Screen Readers

- Consistent landmark and heading-level usage across MFEs (typically enforced via shared design-system guidance/components) so the page's overall structure makes sense to assistive technology regardless of which team built which section.

## ARIA Strategy

- Avoid duplicate or conflicting `id` attributes across independently-built MFEs sharing one DOM — a common, easy-to-miss bug class in same-document composition, since ARIA relationships (`aria-labelledby`, etc.) depend on unique IDs that two independently-developed codebases have no inherent way to coordinate on without a shared convention or namespacing strategy.

## Focus Management

- When navigation swaps which MFE occupies a region, focus must be moved deliberately and predictably (e.g., to the new region's main heading), rather than being silently lost or left on a now-unmounted element.

## Enterprise Accessibility Requirements

- Integration-level accessibility testing (testing the actually-composed page, not just each MFE's isolated Storybook-style tests) is essential here, since per-MFE compliance doesn't guarantee composed-page compliance.

---

# PART 9 — Security

## Authentication

- The host owns authentication and session establishment, passing the resulting identity/session context down to remotes through the defined contract — remotes don't independently implement login.

## Authorization

- Each remote enforces its own feature-level authorization against its own backend, using the identity context the host provides, rather than the host needing to know the details of every remote's permission model.

## Session Management

- Session/token handling lives in one place (the host) and is provided to remotes through a controlled interface, avoiding a situation where multiple independently-built MFEs each handle raw credentials inconsistently.

## XSS Protection

- Standard sanitization practices apply within each MFE, but the **shared-DOM nature of most runtime composition approaches means an XSS vulnerability in one MFE can potentially affect others sharing the same page** — this is a structural property of same-document composition that needs to be explicitly acknowledged, not an afterthought.

## CSRF Protection

- Standard CSRF protections apply per-MFE for its own backend calls; nothing unusual is introduced by the federation pattern itself here.

## Clickjacking Protection

- Standard frame-ancestors protections for the composed app as a whole; not significantly different from a monolithic app's posture.

## Sensitive Data Handling

- **Content Security Policy must explicitly allowlist each trusted remote's origin** for script loading — this allowlist is itself a piece of security-relevant infrastructure that must be maintained as MFEs are added, changed, or retired.
- For **lower-trust scenarios** (a less-trusted internal team, or genuinely third-party code), consider iframe-based isolation instead of same-document composition — trading UX/integration smoothness for a much stronger trust boundary, since an iframe gets its own JavaScript realm and can be sandboxed far more strictly.

---

# PART 10 — Offline Support

## Service Workers

- Offline/caching strategy is genuinely more complex here than in a single-team app: the service worker must account for **multiple independently-versioned bundles** (the host shell plus N remotes), each potentially updating on its own schedule.

## Local Storage Usage

- Each MFE manages its own local storage usage scoped to its own concerns; shared concerns (e.g., a user preference relevant across MFEs) go through the host's shared context rather than being independently read/written by multiple MFEs from a shared key, which would otherwise risk silent conflicts.

## IndexedDB

- Same principle as local storage: each MFE owns its own data; genuinely shared data is mediated by the host rather than multiple MFEs writing to the same store independently.

## Synchronization Strategy

- Each MFE syncs its own offline-queued actions with its own backend independently; there's no cross-MFE synchronization concern beyond what the shared contract explicitly covers.

## Conflict Resolution

- The practical "conflict" risk in this domain is a **cache-versioning mismatch**: a user has an old cached host shell that doesn't know how to correctly resolve a newly-versioned remote's manifest format. Mitigated by versioning the host-remote contract explicitly and having the host handle (or gracefully reject with a refresh prompt) manifest versions it doesn't recognize, rather than failing unpredictably.

---

# PART 11 — Monitoring

## Logging

- Structured client logs tagged with **which MFE/team owns the code path** involved, so errors and performance issues can be attributed and routed to the correct team automatically rather than requiring manual triage.

## Metrics

- **Per-MFE error rate, remote-load latency, and load-failure rate** are the core operational signals, tracked separately per team/remote so a regression is immediately attributable.
- **Version-skew monitoring**: tracking which versions of which remotes are actually live in production at any given time, since independent deployability means this isn't a single, simple "what version is deployed" answer the way it would be for a monolith.

## Error Tracking

- Errors are automatically attributed to the owning team/MFE based on the source of the failure, supporting the core organizational promise that each team owns and is accountable for its own slice — without requiring a central team to manually triage every incident.

## User Monitoring

- Core Web Vitals and other RUM data are captured for the composed page as the user experiences it, but **attributed per MFE** where possible (e.g., which remote's content contributed most to a slow LCP) so the team responsible for a regression can be identified directly.

## Performance Monitoring

- Synthetic tests exercise the **fully composed page** (not just each MFE in isolation) on a schedule, since composition-specific regressions (e.g., a shared-dependency version mismatch causing extra bundle weight) only show up at the integration level.

---

# PART 12 — Trade-Off Analysis

## Runtime Composition (Module Federation) vs. Build-Time Composition (npm Packages)

- **Why choose runtime composition**: true independent deployability — a team ships a new remote version and users get it on next load, with no host rebuild required.
- **Alternative**: each MFE published as a versioned npm package, composed into the host at the host's own build time.
- **Pros of runtime composition**: fastest possible independent deploy cycle, no host rebuild needed for a remote-only change.
- **Cons**: more runtime complexity (manifest resolution, shared-scope negotiation, the failure modes that come with loading code at runtime from another team's infrastructure).
- **When build-time composition is preferable**: organizations with less frequent deploy needs per MFE, or ones that value the stronger compile-time guarantees and simpler debugging of a single build step, may reasonably prefer this — accepting a host rebuild as the cost of needing to ship a remote change.

## Same-Document Composition vs. Iframe-Based Isolation

- **Why choose same-document composition**: much smoother UX integration — shared scroll, easy cross-MFE layout, simpler accessibility tree, no iframe-specific quirks.
- **Alternative**: each MFE rendered inside its own iframe.
- **Pros of iframes**: a genuinely strong trust/security boundary — a vulnerability or crash in one MFE is far better contained.
- **Cons**: harder cross-frame communication, broken shared-scroll/layout expectations, separate accessibility trees that need extra work to feel coherent.
- **When iframes are the right choice**: lower-trust scenarios — genuinely third-party code, or internal teams/MFEs that need a much stronger isolation guarantee than "we trust each other and use error boundaries" provides.

## Shared Singleton Dependencies vs. Independently-Versioned Dependencies per MFE

- **Why choose shared singletons**: avoids the page-weight multiplication problem entirely — one copy of React (or equivalent) regardless of how many MFEs are composed.
- **Alternative**: each MFE bundles and uses its own version of shared libraries independently.
- **Pros of shared singletons**: dramatically better performance at scale.
- **Cons**: requires version-compatibility coordination across teams — a team can't unilaterally jump to a major new version of a shared dependency without considering compatibility with the rest of the federation.
- **When independent versioning might be tolerated**: a small number of MFEs, or ones using genuinely different frameworks where sharing isn't even possible — though this should be a deliberate, acknowledged trade-off given its real performance cost, not a default.

## Host-Owned Routing vs. Remote-Owned Sub-Routing

- **Why choose host-owned top-level routing with remote-owned sub-routes**: a clean, predictable ownership boundary — the host decides which MFE owns which top-level path, and each remote is free to manage its own internal routing within that boundary however it likes.
- **Alternative**: a more decentralized approach where remotes register their own routes dynamically.
- **Pros of the host-owned model**: simpler to reason about, easier to debug "why did this URL load this MFE."
- **Cons**: requires the host to maintain an explicit route-to-MFE mapping, which is a small but real piece of shared configuration every team interacts with.
- **When dynamic, remote-registered routing might be preferred**: a very large number of MFEs where maintaining an explicit central mapping becomes its own bottleneck — though this trades simplicity for flexibility and should be adopted deliberately, not by default.

---

# PART 13 — Follow-Up Questions

1. **Why are micro-frontends primarily an organizational solution rather than a performance optimization?** They exist to let many teams deploy independently without coordinating releases; naively composing many separately-built bundles is, if anything, a performance cost to be carefully managed, not a benefit in itself.
2. **How do you prevent every MFE from shipping its own copy of React?** A shared dependency scope with a singleton flag negotiates a single shared instance across the host and all composed remotes.
3. **What happens if a remote fails to load at runtime?** A per-MFE error boundary at that mount point shows a contained fallback UI; the host can also retry with backoff or fall back to a previously cached-working version.
4. **How would you decide whether a given organization should even adopt micro-frontends?** Based on real, demonstrated coordination pain at the organization's actual team scale — a well-modularized monolith is often the better choice below a certain scale, and the complexity of full runtime federation should be justified against that simpler alternative.
5. **How do you handle a security vulnerability in one MFE when using same-document composition?** Acknowledge that same-document composition means a vulnerability can potentially affect the shared page; mitigate with strict per-MFE sanitization practices and, for genuinely lower-trust code, consider iframe isolation instead.
6. **What's the right way for two MFEs to communicate (e.g., a cart MFE updating a header MFE's badge count)?** A minimal, explicitly versioned event/shared-state contract — never one MFE reaching directly into another's internals or DOM.
7. **How would you roll out a new version of one team's remote safely?** Canary/feature-flag the remote resolution at the host level, exposing the new version to a percentage of users while monitoring its specific error rate and performance, independent of any other team's remotes.
8. **How do you keep accessibility consistent across independently-built MFEs?** Shared design-system components and conventions (consistent heading/landmark structure), plus integration-level accessibility testing of the actually-composed page, not just each MFE in isolation.
9. **What's your strategy for shared-dependency version upgrades across many teams?** Treat it like design-system versioning: clear compatibility ranges, deprecation windows, and automated compatibility testing across the federation before a shared-dependency upgrade is rolled out broadly.
10. **How would you debug an issue that only appears when two specific MFEs are composed together?** This is one of the genuinely harder aspects of this architecture; strong per-MFE error/performance attribution plus integration-level synthetic testing of realistic page compositions are the main tools, since per-MFE-isolated testing won't surface this class of bug.
11. **How do you avoid ID collisions between two independently-built MFEs sharing one DOM?** A shared namespacing convention (e.g., prefixing IDs with a team/MFE identifier) agreed upon as part of the shared contract.
12. **What's the right ownership model for routing?** Generally, the host owns top-level route-to-MFE mapping while each remote freely manages its own internal sub-routing — a clean, debuggable boundary.
13. **How would you migrate an existing monolith to this architecture?** Incrementally, via a strangler-fig approach — extract one route/feature at a time into an independently-deployed MFE behind the host's routing, rather than attempting a full rewrite.
14. **What telemetry would tell you a specific team's MFE is dragging down overall page performance?** Per-MFE-attributed Core Web Vitals and load-latency metrics, so a regression is immediately traceable to the responsible team rather than showing up only as an unexplained aggregate regression.
15. **Why might a company choose build-time composition over runtime Module Federation?** If deploy frequency per MFE is low and the team values simpler debugging and stronger compile-time guarantees over the fastest possible independent deploy cycle.
16. **How do you prevent one MFE's CI/CD pipeline from needing to know about every other MFE?** Each pipeline only needs to publish its own remote entry point to its own known location; the host's manifest-resolution mechanism is what connects them, not direct pipeline-to-pipeline coordination.
17. **What's the risk of a shared global state store across MFEs, beyond the minimal contracted state?** It quietly recreates the tight coupling between teams that the whole architecture exists to avoid — defeating much of the organizational benefit while still paying the technical complexity cost.
18. **How would you handle a host redeploy without requiring every remote to redeploy simultaneously?** Version the host-remote contract explicitly; as long as a remote still conforms to a contract version the host supports, it continues working unchanged across host redeploys.
19. **What's a realistic failure mode if shared-dependency version negotiation goes wrong?** Two genuinely incompatible versions of a "shared" library both get loaded, defeating the de-duplication goal and potentially causing subtle runtime bugs from having two instances of something expected to be a singleton (e.g., two separate React instances managing overlapping DOM).
20. **How do you decide which features should be a shared host capability versus owned independently by each MFE?** Anything genuinely cross-cutting and rarely changing (auth, design system, top-level routing) belongs in the shared contract; anything specific to one team's domain belongs entirely within that team's MFE — when in doubt, default to keeping it within the owning MFE to preserve independence.

---

# PART 14 — Staff Engineer Deep Dive

## Architectural Evolution

- Organizations typically evolve from a **single monolith**, to a **modular monolith** with clear internal ownership boundaries (often sufficient for quite a long time), to **micro-frontends** only once the coordination pain of shipping through one shared deployment pipeline becomes a genuine, demonstrated organizational bottleneck — a staff engineer should be able to articulate this as a scale-triggered progression, not assume micro-frontends are the obvious starting point.

## Long-Term Maintainability

- The **host-remote contract** (routing boundaries, shared dependency versions, the event/state contract) is the single piece of infrastructure every team depends on, and is maintained with the same care and review rigor as a design system's token/component contract — because a careless change here has the same kind of organization-wide blast radius.

## Team Scalability

- A dedicated platform team typically owns the shell, the shared-dependency scope, and contract governance, while feature teams independently own and deploy their own remotes — this is the entire point of the architecture, and its success is measured by how rarely feature teams need to coordinate with each other or with the platform team for ordinary changes.

## Platform Strategy

- Treating the host-remote contract as **internal platform infrastructure** — versioned, documented, with a clear deprecation policy for breaking changes — is what makes the architecture sustainable past the first few teams; without this discipline, the federation tends to silently re-accumulate the same tight coupling and coordination overhead it was built to eliminate.

## Technical Debt Management

- Shared-dependency version drift across many independently-deployed remotes is the primary, ongoing technical debt risk in this architecture; mature platforms invest in automated compatibility testing across the whole federation specifically to catch this before it becomes a production incident.

## Migration Strategy

- Monolith-to-MFE migrations proceed via **strangler-fig extraction**: one route or feature at a time is pulled out into an independently-deployed remote behind the host's routing, with the monolith continuing to serve everything not yet extracted — allowing the migration to happen gradually, safely, and without a risky big-bang cutover.

---

# PART 15 — Production Reality

## What Most Companies Actually Do

- Most organizations that successfully adopt this pattern do so **only once they've hit a real, felt coordination bottleneck** at a meaningful team scale — premature adoption by a small number of teams is a common, well-documented regret.
- Many real-world "micro-frontend" systems are **simpler than full runtime Module Federation** — some are just separately deployed applications composed via a path-based reverse proxy/router, or build-time-composed from versioned packages — full runtime federation with dynamic shared-dependency negotiation is powerful but is not the only, or even the most common, way to achieve the core organizational goal.

## Common Anti-Patterns

- **Premature adoption** by a handful of teams, adding substantial architectural complexity to solve a coordination problem that a well-organized modular monolith would have handled with far less overhead.
- **No shared-dependency governance**, leading to exactly the page-weight bloat (multiple framework copies) the architecture is supposed to prevent.
- **Secretly coupled remotes** that quietly depend on host internals or another remote's implementation details (rather than the explicit shared contract) — this defeats independent deployability in practice even though the systems are nominally "separate," and the coupling often isn't discovered until a seemingly unrelated change breaks something unexpectedly.

## Lessons Learned

- **Failure isolation matters more in practice than most teams initially expect** — in any sufficiently large federation, some remote will eventually fail to load or will throw at runtime, and a design that didn't take per-MFE error boundaries seriously from the start tends to learn this lesson via a real production incident rather than in design review.
- **The shared contract is both the architecture's main strength and its main ongoing maintenance burden** — treating it as "done" after initial design, rather than as living infrastructure requiring the same governance rigor as a design system, is a common, costly mistake.

## Real-World Failure Patterns

- **Shared-dependency upgrade breaking multiple remotes simultaneously** is a recurring, organizationally painful failure pattern — a seemingly routine upgrade to a shared library, done without adequate cross-federation compatibility testing, can cascade into outages across several teams' surfaces at once.
- **Version mismatch between host and a specific remote** breaking that remote (or, worse, the whole page) at runtime is a common operational issue, which is exactly why explicit contract versioning and graceful handling of unrecognized/incompatible versions are treated as core requirements rather than nice-to-haves.

---

# PART 16 — Interview Summary

## 5-Minute Answer

"Micro-frontends solve an organizational problem — letting many teams deploy independently — not primarily a technical one, and that framing should drive every architecture decision. A host/shell app owns top-level routing, shared chrome, auth context, and critically, a shared dependency scope with singleton flags so the framework itself isn't duplicated across every composed remote. Each team's remote is independently built, versioned, and deployed, loaded by the host at runtime through a manifest-resolution mechanism like Module Federation. Cross-MFE communication goes through a deliberately minimal, explicitly versioned contract — never direct access into another team's internals. Every MFE mount point gets its own error boundary so one team's failure doesn't take down the page. And I'd be upfront that this approach has a real complexity and performance cost that needs to be justified by genuine organizational scale — a well-modularized monolith is often the better choice below a certain team count."

## 15-Minute Answer

Extend with: the full architecture (host/shell, the shared-dependency scope, the manifest-resolution layer, independently-deployed remotes, and each team's own CI/CD pipeline); the data-flow walkthroughs for page load, cross-MFE navigation, and cross-MFE events; the failure-isolation and versioning strategy (per-MFE error boundaries, contract versioning, canary rollout of individual remotes); and at least two explicit trade-offs — runtime vs. build-time composition, and same-document vs. iframe-based isolation — stated with the specific trust and deploy-frequency considerations that justify one over the other for a given organization.

## 30-Minute Deep Dive

Cover everything above, plus: the full scalability progression and why a well-modularized monolith is often correct at small-to-medium team scale, with federation justified only past a real coordination bottleneck; the accessibility challenges specific to composed pages (focus management and landmark consistency across independently-built MFEs, ID-collision risk in shared-DOM composition); the security trade-off between same-document composition and iframe isolation depending on inter-team trust level; the monitoring strategy centered on per-MFE error/performance attribution and version-skew tracking across the federation; and a staff-level closing on how the host-remote contract is governed as internal platform infrastructure with the same rigor as a design system, how strangler-fig migration enables incremental adoption from an existing monolith, and how production reality (most successful adoptions happening only at real scale, and the recurring real-world failure modes around shared-dependency upgrades and contract version mismatches) tempers the architecture into something an organization can operate safely for years rather than a one-time technical decision.
