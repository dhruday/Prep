# Frontend System Design
## Design YouTube Homepage

---

> **Estimated Interview Duration:** 45–60 minutes
> **Difficulty:** L5 / L6 / Staff Engineer
> **Prerequisites:** React, TypeScript, REST APIs, Browser internals, HTTP, Caching, Performance, Web Security, Accessibility

---

## Table of Contents

1. [Understanding the Product](#chapter-1-understanding-the-product)
2. [Requirement Gathering](#chapter-2-requirement-gathering)
3. [Scale Estimation](#chapter-3-scale-estimation)
4. [High-Level Architecture](#chapter-4-high-level-architecture)
5. [Frontend Architecture](#chapter-5-frontend-architecture)
6. [Component Hierarchy](#chapter-6-component-hierarchy)
7. [API Design](#chapter-7-api-design)
8. [Data Flow](#chapter-8-data-flow)
9. [State Management](#chapter-9-state-management)
10. [Rendering Strategy](#chapter-10-rendering-strategy)
11. [Performance Optimization](#chapter-11-performance-optimization)
12. [Infinite Scrolling](#chapter-12-infinite-scrolling)
13. [Caching Strategy](#chapter-13-caching-strategy)
14. [Search](#chapter-14-search)
15. [Recommendation System](#chapter-15-recommendation-system)
16. [Accessibility](#chapter-16-accessibility)
17. [Responsive Design](#chapter-17-responsive-design)
18. [Error Handling](#chapter-18-error-handling)
19. [Security](#chapter-19-security)
20. [Monitoring](#chapter-20-monitoring)
21. [Testing](#chapter-21-testing)
22. [Tradeoffs](#chapter-22-tradeoffs)
23. [Interview Walkthrough](#chapter-23-interview-walkthrough)
24. [Google Interviewer Expectations](#chapter-24-google-interviewer-expectations)
25. [100+ Follow-up Questions](#chapter-25-100-follow-up-questions)
26. [Common Mistakes](#chapter-26-common-mistakes)
27. [Best Practices](#chapter-27-best-practices)
28. [Complete Summary](#chapter-28-complete-summary)
- [Appendix](#appendix)

---

## CHAPTER 1: Understanding the Product

### Why YouTube Exists

YouTube was founded in 2005 as a video-sharing platform and acquired by Google in 2006 for $1.65B. It exists to democratize video publishing and consumption — giving anyone with a camera the ability to reach a global audience, and giving viewers instant access to every form of video content imaginable.

From a Google perspective, YouTube is a critical asset: it is the second-largest search engine on the planet, and it drives billions of dollars in advertising revenue annually.

---

### Business Goals

| Goal | Description |
|---|---|
| Maximize watch time | More time on platform = more ad impressions |
| Creator retention | If creators are happy, content supply stays high |
| User retention | Daily habit formation = sustainable revenue |
| Advertiser ROI | Ensure ads reach the right audience at right moment |
| Platform trust | Minimize harmful content to retain users and regulators |
| Revenue diversification | Ads, Premium, Super Thanks, channel memberships |

---

### User Goals

```
┌─────────────────────────────────────────────────────┐
│               What Users Actually Want              │
├─────────────────────────────────────────────────────┤
│  1. Discover interesting videos quickly             │
│  2. Continue watching where they left off           │
│  3. Find content from channels they follow          │
│  4. Not be overwhelmed by irrelevant content        │
│  5. Share content easily with friends               │
│  6. Watch on any device, any network condition      │
│  7. Control their experience (filters, history)     │
└─────────────────────────────────────────────────────┘
```

---

### Creator Goals

| Creator Need | How YouTube Homepage Serves It |
|---|---|
| Views and reach | Algorithm surfaces new creators to relevant audiences |
| Subscriber growth | Homepage exposes non-subscribers to their content |
| Revenue | More views = more ad revenue sharing |
| Analytics | Understand which thumbnails/titles perform best |
| Consistency | Predictable placement for subscribers |

---

### Revenue Goals

YouTube's revenue model as reflected in the homepage design:

```
Revenue Streams on Homepage
════════════════════════════════════════════════
  Pre-roll ads         → Attached to video play
  Display ads          → Banners in feed
  Sponsored content    → Promoted video cards
  YouTube Premium      → Ad-free experience
  Shopping integration → Product shelf under videos
  Super Thanks         → Post-play tipping
════════════════════════════════════════════════
```

**Key insight for interviews:** Every design decision on the homepage has a revenue implication. Faster load time = more videos watched = more ads served. Better recommendations = higher CTR on ads. This is why performance is not just a UX concern — it's a business concern.

---

### Success Metrics

#### Primary KPIs

| Metric | Target | Why |
|---|---|---|
| CTR (Click-Through Rate) | ~7–10% | Shows recommendation quality |
| Watch Time per session | >20 min | Core engagement signal |
| Session starts from homepage | >60% | Measures homepage stickiness |
| Retention rate | >85% day-7 | Habit formation |
| First meaningful paint | <1.5s | Perceived performance |
| Time to interactive | <3s | Functional usability |

#### Secondary KPIs

| Metric | Description |
|---|---|
| Scroll depth | How far users scroll before clicking |
| Thumbnail impression ratio | How often thumbnails are viewed vs clicked |
| Shorts engagement lift | Did Shorts increase overall session time? |
| Recommendation diversity score | Are users stuck in filter bubbles? |
| Ad viewability rate | % of ads that render in viewport |

---

### Real-World Example: YouTube Homepage Design Decisions

- **Thumbnails are 16:9 at 1280×720** — optimized for CTR, not aesthetics
- **Shorts row is horizontal scroll** — different interaction paradigm, lower cognitive cost
- **Category chips at top** — reduce choice paralysis, funnel users into preference clusters
- **No infinite scroll for signed-out users** — reduces server load, promotes sign-up
- **Autoplay preview on hover** — increases engagement but adds bandwidth cost

---

## CHAPTER 2: Requirement Gathering

### Clarifying Questions & Expected Answers

This is the most critical opening section in any system design interview. You must ask structured questions before designing anything.

```
Interview Simulation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You: "Before I start designing, I'd like to clarify scope.
      Are we designing the homepage for a logged-in user,
      a logged-out user, or both?"

Interviewer: "Let's focus on logged-in users for now."

You: "Should I consider all devices — desktop, mobile, TV — 
      or focus on one?"

Interviewer: "Design for desktop-first, mention mobile."

You: "Is this a new design or improving the existing one?"

Interviewer: "Greenfield, assume no existing system."

You: "Should I include Shorts, or just regular videos?"

Interviewer: "Include Shorts row as a section."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Functional Requirements

#### Must Have (P0)

- [ ] Display personalized video feed for logged-in user
- [ ] Show video thumbnail, title, channel name, views, upload time
- [ ] Horizontal Shorts row
- [ ] Category filter chips (All, Gaming, Music, News, etc.)
- [ ] Infinite scroll / load more
- [ ] Sidebar with subscriptions, trending, library
- [ ] Header with search, notifications, account menu
- [ ] Video hover-preview (desktop)
- [ ] Responsive layout (desktop/tablet/mobile)
- [ ] Loading skeleton states
- [ ] Error and empty states

#### Should Have (P1)

- [ ] "Not interested" / "Don't recommend channel" options
- [ ] Watch later functionality
- [ ] Share video card
- [ ] Continue watching row
- [ ] Subscription activity feed
- [ ] Watch history integration

#### Nice to Have (P2)

- [ ] Offline support / Service Worker
- [ ] Dark mode
- [ ] Accessibility full compliance (WCAG 2.1 AA)
- [ ] Background feed refresh
- [ ] Push notifications for new uploads

---

### Non-Functional Requirements

| Requirement | Target | Reasoning |
|---|---|---|
| Page load time | < 2s on 4G | P75 users on mobile |
| First Contentful Paint | < 1.2s | Google CWV benchmark |
| Largest Contentful Paint | < 2.5s | CWV "Good" threshold |
| Cumulative Layout Shift | < 0.1 | Skeleton prevents this |
| Time to Interactive | < 3.5s | Interaction readiness |
| Availability | 99.99% uptime | < 1 hour/year downtime |
| Feed freshness | < 5 min stale | Background revalidation |
| Accessibility | WCAG 2.1 AA | Legal and ethical requirement |
| Browser support | Chrome, Firefox, Safari, Edge (last 2 versions) | Coverage > 95% |

---

### Assumptions

```
Assumptions Made (State these in the interview):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. User is authenticated via Google OAuth
2. Recommendation engine exists as a separate service
3. CDN already hosts video thumbnails globally
4. Backend APIs follow REST (not GraphQL, unless asked)
5. React is the frontend framework
6. TypeScript for type safety
7. Mobile app is separate (not in scope)
8. A/B testing infrastructure exists
9. Analytics pipeline exists (we plug into it)
10. Content moderation is a backend concern
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Scope Definition

```
┌─────────────────────────────────────┐
│          IN SCOPE                   │
├─────────────────────────────────────┤
│ • Video feed (main content)         │
│ • Category chips                    │
│ • Shorts row                        │
│ • Header (search, nav)              │
│ • Sidebar navigation                │
│ • Infinite scroll                   │
│ • Skeleton loading                  │
│ • Error/empty states                │
│ • Hover preview                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│          OUT OF SCOPE               │
├─────────────────────────────────────┤
│ • Video player                      │
│ • Comments system                   │
│ • Creator Studio                    │
│ • Live streaming                    │
│ • YouTube Premium billing           │
│ • Push notifications infra          │
└─────────────────────────────────────┘
```

---

## CHAPTER 3: Scale Estimation

### Why Scale Estimation Matters in Interviews

Interviewers at L5/L6 expect you to think like an engineer who has shipped at scale. Estimation grounds your design decisions. It answers: "Why do we need a CDN?" "Why do we need caching?" "Why do we need virtualization?"

---

### User Estimation

```
Global Scale Estimation (YouTube actual: ~2.7B users)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total registered users:        2,700,000,000
Monthly active users:          2,000,000,000  (~74% of registered)
Daily active users:              500,000,000  (~25% of MAU)
Peak concurrent users:            50,000,000  (~10% of DAU)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Request Estimation

```
Requests Per Second (Homepage Load)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAU:                          500,000,000
Homepage visits/day per user: ~3 sessions
Total homepage requests/day:  1,500,000,000
Requests per second (avg):    1,500,000,000 / 86,400 ≈ 17,361 RPS
Peak multiplier:              ~5x during events
Peak RPS:                     ~87,000 RPS

Per homepage load:
 → 1 feed API call
 → ~20 thumbnail image requests
 → 1 user preferences call
 → 1 ad targeting call (async)
 → Analytics beacons (fire-and-forget)

Total requests per homepage:  ~25 sub-requests
Total infra RPS:              17,361 × 25 ≈ 434,000 RPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Bandwidth Estimation

```
Bandwidth Estimation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Per homepage load:
  HTML + JS bundle:    ~300 KB (gzipped)
  CSS:                 ~50 KB
  Thumbnails (20):     20 × ~15 KB = ~300 KB
  API responses:       ~50 KB (JSON, compressed)
  Fonts + Icons:       ~30 KB
  ─────────────────────────────
  Total per load:      ~730 KB

Daily bandwidth:
  1,500,000,000 loads × 730 KB = ~1,095,000 TB/day
                                = ~1.1 Exabytes/day

Note: CDN serves ~95% of static assets, reducing origin load significantly.
Origin servers handle only dynamic API responses.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Memory and Cache Estimation

```
Cache Requirements
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Per user session memory:    ~5 MB (DOM, JS heap, video data)
Concurrent users:           50,000,000
Server-side cache needed:   Hundreds of TBs (thumbnails, feed data)

Browser-side:
  Service Worker cache:     ~50 MB per user
  IndexedDB:                ~10 MB per user
  Memory cache (React):     ~10 MB per tab
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### What This Tells Us About Design

```
Scale Insight → Design Decision
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
87,000 RPS peak       → CDN is not optional, it's mandatory
730 KB per load       → Aggressive code splitting required
20 thumbnail reqs     → Lazy loading + CDN + WebP critical
50M concurrent users  → No blocking synchronous operations
5M concurrent tabs    → Memory leak prevention critical
1.1 EB/day bandwidth  → Edge caching saves billions in infra
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> **Interview Tip:** Don't just throw out numbers. Explain *what the numbers imply* for your design. This is what separates L5 from L4 candidates.

---

## CHAPTER 4: High-Level Architecture

### System Context

```
╔═══════════════════════════════════════════════════════════════════╗
║                    YOUTUBE HOMEPAGE SYSTEM                        ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   [User Browser]                                                  ║
║       │                                                           ║
║       ▼                                                           ║
║   [CDN Edge]  ◄──── Static Assets (HTML/CSS/JS/Images)           ║
║       │                                                           ║
║       ▼                                                           ║
║   [API Gateway / Load Balancer]                                   ║
║       │                                                           ║
║   ┌───┴──────────────────────────────────┐                       ║
║   │                                      │                       ║
║   ▼                                      ▼                       ║
║ [Feed Service]                    [Auth Service]                 ║
║   │                                      │                       ║
║   ├──► [Recommendation Engine]    [User Service]                 ║
║   ├──► [Ranking Service]                                          ║
║   ├──► [Video Metadata Service]   [Ad Service]                   ║
║   └──► [Cache Layer (Redis)]                                      ║
║                                                                   ║
║   [Analytics Pipeline] ◄── Events from browser                  ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### Detailed Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    React Application                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │  │
│  │  │  Header  │  │ Sidebar  │  │   Feed   │  │ MiniPlayer  │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────────┘  │  │
│  │                    Service Worker                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
          │  HTTPS Requests                  │  Analytics Events
          │                                  │
          ▼                                  ▼
┌─────────────────────┐           ┌──────────────────────┐
│   Cloudflare CDN    │           │  Analytics Ingestion  │
│   (Edge Network)    │           │  (Kafka / Pub-Sub)    │
│  - Static assets    │           └──────────────────────┘
│  - Image serving    │
│  - DDoS protection  │
└─────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   API GATEWAY / BFF                         │
│  (Backend For Frontend — aggregates multiple services)      │
│  - Rate limiting       - Auth validation                    │
│  - Request routing     - Response aggregation               │
│  - SSL termination     - Logging                            │
└─────────────────────────────────────────────────────────────┘
          │
    ┌─────┴──────────────────────────────────────┐
    │                                            │
    ▼                                            ▼
┌─────────────────┐                   ┌─────────────────┐
│   FEED SERVICE  │                   │   AUTH SERVICE  │
│                 │                   │                 │
│ - Fetch videos  │                   │ - OAuth 2.0     │
│ - Apply filters │                   │ - JWT tokens    │
│ - Pagination    │                   │ - Session mgmt  │
└────────┬────────┘                   └─────────────────┘
         │
   ┌─────┼────────────────────────┐
   │     │                        │
   ▼     ▼                        ▼
┌───────────┐  ┌──────────────┐  ┌─────────────────┐
│ RECOMMEND │  │   RANKING    │  │  VIDEO METADATA  │
│  ENGINE   │  │   SERVICE    │  │    SERVICE       │
│           │  │              │  │                  │
│ ML models │  │ Re-rank by:  │  │ - Title/desc     │
│ User vec  │  │ - Freshness  │  │ - Channel info   │
│ Collab    │  │ - CTR pred   │  │ - View counts    │
│ filtering │  │ - Watch time │  │ - Thumbnails URL │
└───────────┘  └──────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│              CACHE LAYER                    │
│  ┌─────────────┐      ┌─────────────────┐  │
│  │   Redis     │      │  Memcached      │  │
│  │  (Feed      │      │  (Thumbnail     │  │
│  │  results)   │      │  metadata)      │  │
│  └─────────────┘      └─────────────────┘  │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│              DATABASE LAYER                 │
│  ┌─────────────┐      ┌─────────────────┐  │
│  │  Bigtable   │      │   Spanner       │  │
│  │  (User      │      │  (Video         │  │
│  │  activity)  │      │  metadata)      │  │
│  └─────────────┘      └─────────────────┘  │
└─────────────────────────────────────────────┘
```

---

### Service Explanation

#### 1. CDN (Content Delivery Network)
- **What:** Globally distributed edge servers (Cloudflare, Akamai, Google's own)
- **Why:** Reduces latency by serving static assets from the nearest geographic node
- **What it serves:** HTML shell, JavaScript bundles, CSS, thumbnail images, webfonts
- **Cache TTL:** JS/CSS (1 year with content hash), thumbnails (24h), HTML (5 min)

#### 2. API Gateway / BFF (Backend for Frontend)
- **What:** Single entry point for all browser requests
- **Why:** Aggregates multiple microservice calls into one response, reducing browser round trips
- **Responsibilities:** Rate limiting, auth validation, request routing, response shaping
- **BFF Pattern:** The gateway can be tailored per client (web vs mobile vs TV)

#### 3. Feed Service
- **What:** The core service that returns the list of videos to display
- **Why separate:** Allows independent scaling from other services
- **Input:** User ID, page cursor, filter preferences
- **Output:** Ordered list of video objects with metadata

#### 4. Recommendation Engine
- **What:** ML-powered service that generates candidate videos for a user
- **Why:** Pure popularity-based feeds have poor personalization
- **How (frontend relevant):** Returns a ranked list of video IDs; feed service hydrates them
- **Latency budget:** Must complete in <100ms to not block page render

#### 5. Ranking Service
- **What:** Re-ranks recommendation candidates using real-time signals
- **Why:** ML model candidates may be stale; ranking applies fresh signals (trending, ads)
- **Signals:** CTR prediction, watch time prediction, freshness, diversity

#### 6. Video Metadata Service
- **What:** Returns title, description, channel, views, duration, thumbnail URL
- **Why separate:** Metadata is read-heavy and can be cached aggressively
- **Cache strategy:** 15-minute TTL for view counts (eventual consistency acceptable)

#### 7. Cache Layer (Redis)
- **What:** In-memory data store for frequently accessed feed results
- **Why:** A cold feed query may take 200ms; cache returns in <5ms
- **What's cached:** Per-user feed for next 30 videos, category-filtered feeds
- **Invalidation:** TTL-based (5 minutes), or event-driven on new uploads from subscriptions

#### 8. Auth Service
- **What:** Validates Google OAuth tokens, issues session cookies
- **Why:** All personalization requires verified user identity
- **Flow:** Browser → API Gateway → Auth Service → validate → forward to Feed Service

#### 9. Analytics Pipeline
- **What:** Captures user events (impressions, clicks, scroll depth, hover time)
- **Why:** Powers future recommendations and A/B test measurement
- **Architecture:** Browser fires events to Kafka ingestion endpoint → BigQuery → ML training

#### 10. Ad Service
- **What:** Determines which promotional cards to inject into the feed
- **Why:** Revenue-critical; must be decoupled to allow independent monetization policy changes
- **Integration:** Async call that runs in parallel to feed loading; injected into pre-defined slots

---

### Request Flow Summary

```
1. User navigates to youtube.com
2. Browser checks CDN for HTML shell        → CDN HIT (cached)
3. Browser downloads JS bundles             → CDN HIT (cache-busted by hash)
4. React boots, fires GET /api/feed         → API Gateway
5. Gateway validates auth token             → Auth Service
6. Gateway routes to Feed Service
7. Feed Service checks Redis cache          → HIT: return cached; MISS: continue
8. Feed Service calls Recommendation Engine → Candidate videos
9. Feed Service calls Ranking Service       → Re-ordered list
10. Feed Service calls Video Metadata       → Hydrated video objects
11. Results cached in Redis (TTL: 5 min)
12. Response returned to browser
13. React renders skeleton → then video cards
14. Thumbnails lazy-loaded as user scrolls  → CDN
15. Analytics events fired asynchronously
```

---

## CHAPTER 5: Frontend Architecture

### Philosophy: Feature-Based Architecture

YouTube's homepage is not a "small app." It has dozens of components, complex state interactions, and is worked on by multiple teams simultaneously. The architecture must scale with team size, not just user load.

---

### Recommended Folder Structure

```
src/
├── app/                          # Application shell
│   ├── App.tsx
│   ├── Router.tsx
│   ├── Providers.tsx             # All context providers
│   └── ErrorBoundary.tsx
│
├── features/                     # Feature modules (domain-based)
│   ├── feed/
│   │   ├── components/
│   │   │   ├── VideoCard/
│   │   │   │   ├── VideoCard.tsx
│   │   │   │   ├── VideoCard.test.tsx
│   │   │   │   ├── VideoCard.stories.tsx
│   │   │   │   └── index.ts
│   │   │   ├── VideoGrid/
│   │   │   ├── ShortsRow/
│   │   │   └── CategoryChips/
│   │   ├── hooks/
│   │   │   ├── useFeed.ts        # Data fetching + pagination
│   │   │   └── useVideoCard.ts   # Hover, focus logic
│   │   ├── services/
│   │   │   └── feedApi.ts        # API call definitions
│   │   ├── store/
│   │   │   └── feedSlice.ts      # Redux slice or Zustand store
│   │   ├── types/
│   │   │   └── feed.types.ts
│   │   └── index.ts
│   │
│   ├── search/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   │
│   ├── sidebar/
│   │   ├── components/
│   │   └── hooks/
│   │
│   └── header/
│       ├── components/
│       └── hooks/
│
├── shared/                       # Shared across features
│   ├── components/
│   │   ├── Button/
│   │   ├── Avatar/
│   │   ├── Skeleton/
│   │   ├── Spinner/
│   │   ├── Modal/
│   │   └── Tooltip/
│   ├── hooks/
│   │   ├── useIntersectionObserver.ts
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── useOnlineStatus.ts
│   ├── utils/
│   │   ├── formatters.ts         # formatViews, formatDuration
│   │   ├── dateUtils.ts
│   │   └── urlUtils.ts
│   └── constants/
│       └── apiEndpoints.ts
│
├── services/                     # API layer
│   ├── apiClient.ts              # Axios/Fetch wrapper with interceptors
│   ├── authService.ts
│   └── analyticsService.ts
│
├── store/                        # Global state
│   ├── index.ts
│   └── middleware/
│
├── types/                        # Global TypeScript types
│   ├── api.types.ts
│   └── common.types.ts
│
└── styles/                       # Design tokens
    ├── tokens.css
    ├── typography.css
    └── animations.css
```

---

### Container vs Presentational Pattern

```
Container Component (Smart)              Presentational Component (Dumb)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━             ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Fetches data                           • Receives props only
• Manages state                          • No side effects
• Handles side effects                   • Highly reusable
• Knows about Redux/Context              • Easy to test in isolation
• Logic-heavy                            • Visual-only
• Not reusable                           • Storybook-friendly

Example: FeedContainer                   Example: VideoCard
  → calls useFeed()                        → receives { video } prop
  → handles loading/error                  → renders thumbnail, title
  → passes videos[] to VideoGrid           → emits onClick
```

```typescript
// Container: knows about data
const FeedContainer: React.FC = () => {
  const { videos, isLoading, error, fetchMore } = useFeed();
  
  if (isLoading && !videos.length) return <FeedSkeleton />;
  if (error) return <FeedError onRetry={fetchMore} />;
  
  return (
    <VideoGrid
      videos={videos}
      onLoadMore={fetchMore}
    />
  );
};

// Presentational: knows about display
const VideoCard: React.FC<{ video: Video; onVideoClick: () => void }> = ({ video, onVideoClick }) => {
  return (
    <article className="video-card" onClick={onVideoClick}>
      <Thumbnail src={video.thumbnailUrl} alt={video.title} />
      <VideoMeta
        title={video.title}
        channel={video.channelName}
        views={video.viewCount}
        uploadedAt={video.publishedAt}
      />
    </article>
  );
};
```

---

### Atomic Design Principles

```
Level 5: Pages         ← HomePage, WatchPage
           │
Level 4: Templates     ← HomepageLayout (Header + Sidebar + Feed)
           │
Level 3: Organisms     ← Feed (VideoGrid + CategoryChips + ShortsRow)
           │
Level 2: Molecules     ← VideoCard (Thumbnail + VideoMeta + ChannelAvatar)
           │
Level 1: Atoms         ← Button, Avatar, Skeleton, Text, Icon
```

**Why this matters in interviews:** It shows you think about component reusability and team scalability. The VideoCard molecule at Storybook level can be tested visually without any API calls.

---

### Performance-Driven Architecture Decisions

| Decision | Why |
|---|---|
| Lazy load feature modules | Feed, Search, Sidebar don't all need to load simultaneously |
| Virtualize the video grid | 1000 DOM nodes at once = jank; only render visible ones |
| Separate server state from UI state | React Query for API data, local state for UI interactions |
| Memoize VideoCard | Re-renders on scroll would be catastrophic at scale |
| Web Workers for heavy computation | Format 500 view counts off the main thread |

---

## CHAPTER 6: Component Hierarchy

### Complete Component Tree

```
App
├── ErrorBoundary
├── Providers (Query, Store, Theme, Auth)
├── Router
└── HomePage
    ├── Header
    │   ├── Logo
    │   ├── SearchBar
    │   │   ├── SearchInput
    │   │   ├── MicButton (voice search)
    │   │   └── SearchSuggestions (dropdown)
    │   │       ├── SuggestionItem (× N)
    │   │       └── RecentSearchItem (× N)
    │   ├── UploadButton
    │   ├── NotificationBell
    │   │   └── NotificationPanel (lazy)
    │   └── UserAvatar
    │       └── AccountMenu (lazy)
    │
    ├── Sidebar
    │   ├── HomeLink
    │   ├── ShortsLink
    │   ├── SubscriptionsSection
    │   │   └── ChannelListItem (× subscribed channels)
    │   ├── Divider
    │   ├── LibrarySection
    │   │   ├── HistoryLink
    │   │   └── WatchLaterLink
    │   └── SubscribePrompt (if < 5 subscriptions)
    │
    └── MainContent
        ├── CategoryChips
        │   ├── Chip ("All") (selected)
        │   ├── Chip ("Gaming")
        │   ├── Chip ("Music")
        │   └── Chip × N...
        │
        ├── ShortsRow (horizontal scroll)
        │   ├── ShortCard × N
        │   └── ShortsScrollButton (left/right)
        │
        ├── ContinueWatchingRow (if applicable)
        │   └── VideoCardWide × N
        │
        └── VideoFeed (infinite scroll)
            ├── VideoGrid
            │   └── VideoCard × N
            │       ├── ThumbnailWrapper
            │       │   ├── Thumbnail (img)
            │       │   ├── VideoDuration (overlay)
            │       │   └── HoverPreview (video, lazy)
            │       ├── ChannelAvatar (img)
            │       └── VideoInfo
            │           ├── VideoTitle
            │           ├── ChannelName
            │           ├── ViewsAndTime
            │           └── MoreOptionsButton
            │               └── VideoCardMenu (lazy)
            │                   ├── SaveToWatchLater
            │                   ├── SaveToPlaylist
            │                   ├── ShareOption
            │                   ├── NotInterested
            │                   └── DontRecommendChannel
            ├── LoadingSkeletonGrid (during load)
            ├── IntersectionSentinel (triggers next page)
            └── EndOfFeedMessage
```

---

### Component Responsibilities

| Component | Responsibility | State It Owns |
|---|---|---|
| `App` | Application shell, provider setup | None |
| `Header` | Global navigation, search access | Search open/closed |
| `SearchBar` | Input, suggestions, submit | Query string, suggestions list |
| `Sidebar` | Navigation links, subscription list | Collapsed/expanded |
| `CategoryChips` | Filter tabs across top | Selected chip |
| `ShortsRow` | Horizontal Shorts carousel | Scroll position |
| `VideoFeed` | Infinite-scrolling grid of videos | None (delegate to hook) |
| `VideoGrid` | CSS Grid layout of VideoCards | None |
| `VideoCard` | Single video item display | Hover state, menu open/closed |
| `ThumbnailWrapper` | Thumbnail image + hover preview | Is-hovering |
| `HoverPreview` | Autoplay preview video on hover | Playing, muted |
| `VideoCardMenu` | Contextual "more options" dropdown | Menu visible |
| `Skeleton` | Loading placeholder | None (pure display) |
| `IntersectionSentinel` | Scroll trigger for pagination | None |
| `EndOfFeedMessage` | "You're all caught up" display | None |

---

### Key Design Principles for Components

```typescript
// 1. VideoCard should be PURE — no API calls, no Redux access
interface VideoCardProps {
  video: VideoItem;
  onVideoClick: (videoId: string) => void;
  onMenuAction: (action: VideoMenuAction, videoId: string) => void;
  isPriority?: boolean; // affects image loading priority
}

// 2. CategoryChips is controlled — parent owns selected state
interface CategoryChipsProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

// 3. IntersectionSentinel is fully generic
interface IntersectionSentinelProps {
  onIntersect: () => void;
  threshold?: number;
  rootMargin?: string;
}
```

---

### Lazy Loading Strategy

```typescript
// Heavy, non-critical components are lazy-loaded
const HoverPreview = React.lazy(() => import('./HoverPreview'));
const VideoCardMenu = React.lazy(() => import('./VideoCardMenu'));
const NotificationPanel = React.lazy(() => import('../header/NotificationPanel'));
const AccountMenu = React.lazy(() => import('../header/AccountMenu'));

// Wrapped in Suspense with appropriate fallbacks
<Suspense fallback={null}>
  {isHovering && <HoverPreview videoId={video.id} />}
</Suspense>
```

---

## CHAPTER 7: API Design

### Primary Endpoints

#### GET /api/v1/feed

```
Request:
GET /api/v1/feed?cursor=eyJpZCI6IjEyMyJ9&limit=20&category=gaming

Headers:
  Authorization: Bearer <jwt_token>
  Accept-Encoding: gzip
  X-Client-Version: web-2024.1.15

Query Parameters:
  cursor   (string)   - Opaque pagination token
  limit    (integer)  - Videos per page (max: 40, default: 20)
  category (string)   - Filter by category slug (optional)
  refresh  (boolean)  - Force fresh recommendations (optional)
```

---

#### Feed Response Schema

```json
{
  "data": {
    "videos": [
      {
        "id": "dQw4w9WgXcQ",
        "title": "Building YouTube's Frontend at Scale",
        "description": "A deep dive into...",
        "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        "thumbnailUrlWebP": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.webp",
        "duration": "PT14M52S",
        "durationSeconds": 892,
        "viewCount": 1420000,
        "likeCount": 45200,
        "publishedAt": "2024-01-10T14:30:00Z",
        "channel": {
          "id": "UC_x5XG1OV2P6uZZ5FSM9Ttw",
          "name": "Google Developers",
          "avatarUrl": "https://yt3.ggpht.com/ytc/...",
          "isVerified": true,
          "subscriberCount": 1200000
        },
        "badges": ["NEW", "HD"],
        "isShort": false,
        "contentRating": "NONE",
        "captionsAvailable": true,
        "recommendationReason": "Based on your watch history"
      }
    ],
    "shorts": [
      {
        "id": "shortId123",
        "title": "60-second coding tip",
        "thumbnailUrl": "https://...",
        "durationSeconds": 58,
        "viewCount": 2400000,
        "channel": { ... }
      }
    ],
    "categories": [
      { "id": "all", "label": "All", "isSelected": true },
      { "id": "gaming", "label": "Gaming" },
      { "id": "music", "label": "Music" },
      { "id": "news", "label": "News" },
      { "id": "learning", "label": "Learning" }
    ]
  },
  "pagination": {
    "nextCursor": "eyJpZCI6IjQ1NiIsInRzIjoxNzA1MDk0ODAwfQ==",
    "hasMore": true,
    "totalEstimated": 500
  },
  "meta": {
    "requestId": "req_abc123",
    "responseTime": 87,
    "cacheStatus": "HIT",
    "freshness": "2024-01-15T10:25:00Z"
  }
}
```

---

### Pagination Strategy: Cursor vs Offset

```
CURSOR PAGINATION (Recommended for YouTube feed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /feed?cursor=<opaque_token>&limit=20

How it works:
  Server encodes position into an opaque token:
  cursor = base64({ lastVideoId: "xyz", timestamp: 1705094800, userId: "abc" })
  
  Next page: client sends cursor from previous response
  
Advantages:
  ✓ Works correctly when new videos are inserted
  ✓ No duplicate or missing items on real-time feeds
  ✓ O(1) database query (index scan from cursor position)
  ✓ Cannot be used to calculate total count (privacy benefit)
  
Disadvantages:
  ✗ Cannot jump to arbitrary pages
  ✗ Cannot easily share deep-linked pages

OFFSET PAGINATION (Not recommended for live feeds)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /feed?offset=40&limit=20

Problems:
  ✗ Video inserted at position 1 → all subsequent items shift → duplicates
  ✗ O(N) database query (must skip N rows)
  ✗ Incorrect results on rapidly-changing feeds
  
When to use offset:
  → Static content (search results with stable ranking)
  → Admin panels (need arbitrary page access)
  → Content that changes infrequently
```

---

### API Versioning

```
URL Versioning (Recommended):
  /api/v1/feed  → Legacy
  /api/v2/feed  → New schema (breaking changes)

Why:
  • Gradual migration — old clients still work
  • CDN can cache by version
  • Easy to sunset: monitor v1 usage, then deprecate

Header versioning:
  Accept: application/vnd.youtube.v2+json
  → Harder to cache at CDN level, not recommended for feeds
```

---

### Error Response Schema

```json
{
  "error": {
    "code": "FEED_UNAVAILABLE",
    "message": "Feed service is temporarily unavailable",
    "retryAfter": 5,
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:25:00Z"
  }
}
```

---

### HTTP Status Codes

| Status | When Used |
|---|---|
| 200 OK | Successful feed response |
| 204 No Content | Category filter has no videos |
| 400 Bad Request | Invalid cursor or limit |
| 401 Unauthorized | No or invalid auth token |
| 403 Forbidden | Token valid but not authorized |
| 404 Not Found | Category not found |
| 429 Too Many Requests | Rate limit exceeded, check `Retry-After` header |
| 500 Internal Server Error | Feed service failure |
| 503 Service Unavailable | Temporary outage, retry with backoff |

---

### Retry Strategy

```typescript
const fetchFeedWithRetry = async (
  cursor?: string,
  maxRetries = 3
): Promise<FeedResponse> => {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const response = await fetchFeed(cursor);
      return response;
    } catch (error) {
      attempt++;
      
      if (!isRetryable(error) || attempt === maxRetries) throw error;
      
      // Exponential backoff with jitter
      const baseDelay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      const jitter = Math.random() * 1000;
      await sleep(baseDelay + jitter);
    }
  }
};

const isRetryable = (error: ApiError): boolean => {
  return [429, 500, 502, 503, 504].includes(error.status);
};
```

---

## CHAPTER 8: Data Flow

### Complete Page Load Lifecycle

```
TIME    EVENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t=0ms   User navigates to youtube.com

t=0ms   Browser requests HTML from CDN
        CDN returns cached HTML shell (200 OK, Cache-Control: max-age=300)

t=50ms  Browser parses HTML, discovers <script> tags
        Sends parallel requests for JS bundles

t=100ms React app boots (hydration / initial render)
        Critical path: App → Providers → HomePage → Header + Sidebar + Feed

t=150ms useFeed() hook fires
        Checks React Query cache → MISS (first load)
        Fires GET /api/v1/feed?limit=20

t=160ms WHILE API call in flight:
        Render skeleton states for VideoGrid
        Header and Sidebar render fully (no async dependency)
        Category chips render with "All" selected

t=300ms API response returns (87ms for cached, 300ms for cold)
        React Query stores response in cache
        State update triggers re-render

t=310ms Skeleton replaced with real VideoCard components
        First 4 thumbnails: eager-loaded (priority)
        Remaining thumbnails: lazy (IntersectionObserver)

t=400ms Above-fold thumbnails loaded from CDN
        LCP event fires → ~400ms (excellent)

t=500ms Time to Interactive achieved
        User can click, scroll, interact

t=600ms Below-fold thumbnails load as user can see them
        Analytics impression events fire for visible cards

t=∞     User scrolls down:
        IntersectionSentinel enters viewport
        fetchNextPage() called
        Next 20 videos append to feed
        New thumbnails lazy-loaded
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### State Machine for Feed Loading

```
                    ┌─────────────────┐
                    │      IDLE       │
                    └────────┬────────┘
                             │ mount / navigate
                             ▼
                    ┌─────────────────┐
                    │    LOADING      │  ← Show skeleton
                    └────────┬────────┘
                   ┌─────────┴──────────┐
                   ▼                    ▼
          ┌────────────────┐   ┌────────────────┐
          │    SUCCESS     │   │     ERROR      │
          │  Show videos   │   │  Show error UI │
          └────────┬───────┘   └───────┬────────┘
                   │                   │
        ┌──────────┴──────┐     ┌──────┴───────┐
        │                 │     │              │
        ▼                 ▼     ▼              ▼
 ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
 │ LOADING_MORE │  │  REFRESHING  │  │   RETRYING   │
 │ (pagination) │  │ (background) │  │  (retry btn) │
 └──────────────┘  └──────────────┘  └──────────────┘
```

---

### Data Flow Diagram (Redux + React Query)

```
Browser                React Query              Redux Store
━━━━━━━━━━             ━━━━━━━━━━━━             ━━━━━━━━━━━━

Component mounts
      │
      ▼
useFeed() called
      │
      ├──────────────► Check cache
      │                    │ HIT → return cached data immediately
      │                    │ MISS → fetch from API
      │                    │
      │                    ▼
      │               GET /api/v1/feed
      │                    │
      │                    ▼
      │               API Response
      │                    │
      │                    ├──► Store in React Query cache
      │                    │    (key: ['feed', category, cursor])
      │                    │
      │                    └──► User action (category change)
      │                              │
      │                              ▼
      │                         Dispatch to Redux
      │                         { type: 'feed/setCategory', payload: 'gaming' }
      │                              │
      │                              ▼
      │                         Redux updates selectedCategory
      │                              │
      │                              ▼
      │                         useFeed() re-runs with new category
      │                         New cache key → new API call
      │
      ▼
Render VideoCards
```

---

### Background Refresh

```typescript
// React Query handles background refresh automatically
const { data } = useQuery({
  queryKey: ['feed', selectedCategory],
  queryFn: () => fetchFeed(selectedCategory),
  
  staleTime: 5 * 60 * 1000,       // Data considered fresh for 5 minutes
  gcTime: 30 * 60 * 1000,         // Keep in cache for 30 minutes
  
  // Background refetch triggers:
  refetchOnWindowFocus: true,      // User comes back to tab
  refetchOnReconnect: true,        // Network reconnect
  refetchInterval: 10 * 60 * 1000, // Every 10 min (optional)
  
  // Don't show loading spinner on background refresh
  // User sees fresh data when ready without disruption
  placeholderData: keepPreviousData,
});
```

---

## CHAPTER 9: State Management

### State Categories

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE IN YOUTUBE HOMEPAGE                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SERVER STATE (React Query / TanStack Query)               │
│    • Feed videos list                                       │
│    • Categories                                             │
│    • User subscriptions                                     │
│    • Channel data                                           │
│    • Shorts data                                            │
│                                                             │
│  UI STATE (useState / local component state)               │
│    • VideoCard hover state                                  │
│    • Menu open/closed                                       │
│    • Sidebar collapsed                                      │
│    • Search bar open (mobile)                               │
│    • HoverPreview playing                                   │
│                                                             │
│  GLOBAL UI STATE (Redux / Zustand)                         │
│    • Selected category chip                                 │
│    • MiniPlayer visibility + current video                  │
│    • Notification count                                     │
│    • User preferences (theme, language)                     │
│    • Toast notifications queue                              │
│                                                             │
│  CACHE STATE (React Query + Browser Cache)                 │
│    • Previous page feed data                                │
│    • Paginated results                                      │
│    • Prefetched next page                                   │
│                                                             │
│  PERSISTENT STATE (localStorage / cookie)                  │
│    • Auth tokens                                            │
│    • User preferences                                       │
│    • Watch later list (offline fallback)                    │
│    • Recent searches                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### State Decision Matrix

| State Type | Tool | Why |
|---|---|---|
| Feed data (server) | TanStack Query | Caching, deduplication, background refresh built-in |
| Pagination state | TanStack Query `useInfiniteQuery` | Automatic cursor tracking |
| Selected category | Zustand / URL param | Needs to persist on back-navigation |
| Hover state | `useState` | Purely local, no sharing needed |
| MiniPlayer state | Zustand | Cross-component (player + header + feed) |
| Auth token | Secure HTTP-only cookie | XSS protection, handled by auth service |
| Recent searches | localStorage | Persist across sessions |
| Toast queue | Zustand | Cross-component queue management |

---

### TanStack Query for Feed

```typescript
// Infinite query for paginated feed
export const useFeed = (category: string) => {
  return useInfiniteQuery({
    queryKey: ['feed', category],
    
    queryFn: async ({ pageParam }) => {
      return feedApi.getFeed({
        cursor: pageParam,
        limit: 20,
        category,
      });
    },
    
    initialPageParam: undefined as string | undefined,
    
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.nextCursor
        : undefined;
    },
    
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

// Derived data from paginated results
export const useFeedVideos = (category: string) => {
  const query = useFeed(category);
  
  const videos = useMemo(() => {
    return query.data?.pages.flatMap(page => page.data.videos) ?? [];
  }, [query.data]);
  
  return { ...query, videos };
};
```

---

### Zustand for Global UI State

```typescript
interface AppStore {
  // MiniPlayer
  miniPlayerVideo: Video | null;
  miniPlayerVisible: boolean;
  setMiniPlayerVideo: (video: Video | null) => void;
  
  // Category
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  
  // Toast
  toasts: Toast[];
  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  miniPlayerVideo: null,
  miniPlayerVisible: false,
  setMiniPlayerVideo: (video) => set({ 
    miniPlayerVideo: video, 
    miniPlayerVisible: !!video 
  }),
  
  selectedCategory: 'all',
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  toasts: [],
  addToast: (toast) => set((state) => ({ toasts: [...state.toasts, toast] })),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));
```

---

### Why NOT Everything in Redux

```
Common Anti-Pattern (Over-engineering):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DON'T do this
dispatch(setHoverState({ videoId: 'abc', isHovering: true }));

Why it's wrong:
  1. Hover state changes 60x/second on scroll → Redux dispatch overhead
  2. Forces all VideoCards to re-render on any hover change
  3. Redux DevTools would be flooded with hover events
  4. No other component needs to know which card is hovered
  5. Hover state is 100% local to VideoCard

Correct approach:
━━━━━━━━━━━━━━━━
// DO this
const [isHovering, setIsHovering] = useState(false);
```

---

## CHAPTER 10: Rendering Strategy

### The Options

| Strategy | Description | Initial Load | SEO | Personalization | Complexity |
|---|---|---|---|---|---|
| CSR (Client-Side Rendering) | JS runs in browser, fetches data | Slow (blank screen first) | Poor | Excellent | Low |
| SSR (Server-Side Rendering) | HTML rendered on server per request | Fast | Excellent | Excellent | Medium |
| SSG (Static Site Generation) | HTML pre-built at deploy time | Very fast | Excellent | None | Low |
| ISR (Incremental Static Regen) | SSG + on-demand regeneration | Fast | Excellent | Limited | Medium |
| Streaming SSR | HTML streamed in chunks | Fast TTFB | Good | Excellent | High |
| RSC (React Server Components) | Server renders components, streams to client | Fast | Excellent | Excellent | High |

---

### YouTube Homepage: Which to Use?

```
Decision Analysis for YouTube Homepage:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ SSG: Cannot use — feed is unique per user, changes every minute
❌ ISR: Cannot use — personalization requires per-user rendering
⚠️  CSR: Works but FCP is slow (blank screen until JS loads)
✅ SSR: Render shell + above-fold content on server
✅ Streaming SSR: Best option — progressive HTML delivery
✅ RSC (partial): Server components for static parts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recommended: Streaming SSR with React Server Components (Next.js 14+)
  1. Server renders Header, Sidebar (static) instantly
  2. Server begins streaming feed while it fetches from API
  3. Suspense boundary shows skeleton while feed loads
  4. First video cards stream in as they're ready
  5. Client hydrates for interactivity
```

---

### Streaming SSR Diagram

```
                Server                              Client Browser
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t=0ms   User requests youtube.com
        Server receives request
        
t=10ms  Server renders <Header /> → STREAMS to browser immediately
        Browser starts painting Header

t=20ms  Server renders <Sidebar /> → STREAMS
        Browser paints Sidebar

t=30ms  Server reaches <Feed /> (Suspense boundary)
        Renders <FeedSkeleton /> → STREAMS immediately
        Simultaneously: fires API call to Feed Service

t=200ms Feed Service returns first 20 videos (from Redis cache)
        Server renders VideoCards → STREAMS progressively

t=220ms Browser paints VideoCards
        LCP event fires (first image visible)

t=300ms Client JS hydrates → makes interactive
        (Click handlers, hover effects, infinite scroll)

t=∞     User scrolls → client-side infinite scroll takes over
        (No more server involvement for pagination)
```

---

### React Server Components Strategy

```typescript
// app/page.tsx (Next.js 14 App Router)
// This is a SERVER COMPONENT — runs on server, no hydration overhead

import { Suspense } from 'react';
import Header from '@/components/Header';        // Server component
import Sidebar from '@/components/Sidebar';      // Server component
import CategoryChips from '@/components/CategoryChips';  // Server component
import FeedSkeleton from '@/components/FeedSkeleton';
import VideoFeed from '@/components/VideoFeed';  // Client component

export default async function HomePage() {
  // This runs on the server — no waterfall, no spinner
  const categories = await fetchCategories(); // Fast, cached on server
  
  return (
    <div className="homepage-layout">
      <Header />           {/* Server rendered, no JS bundle */}
      <Sidebar />          {/* Server rendered, no JS bundle */}
      <main>
        <CategoryChips categories={categories} />  {/* Server rendered */}
        
        {/* Suspense boundary: show skeleton while feed loads */}
        <Suspense fallback={<FeedSkeleton />}>
          <VideoFeed />    {/* Async server component — fetches and renders */}
        </Suspense>
      </main>
    </div>
  );
}

// Client component — needs interactivity
'use client';
export function VideoFeedClient({ initialVideos }: { initialVideos: Video[] }) {
  const { videos, fetchNextPage, hasNextPage } = useInfiniteQuery({...});
  // Client-side infinite scroll
  return <VideoGrid videos={videos} />;
}
```

---

### Hydration Pitfalls

```
Common Hydration Mistakes:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Mismatch: Server HTML ≠ Client HTML
   → Occurs when using Math.random(), Date.now() during SSR
   → Fix: Use stable IDs, avoid random in render

❌ Hydrating too much
   → Shipping full client bundle for Header (static)
   → Fix: Make Header a Server Component

❌ Blocking hydration
   → Large synchronous JS in useLayoutEffect
   → Fix: Move to useEffect or defer

✅ Partial Hydration (islands architecture)
   → Only interactive parts need hydration
   → VideoCard hover = interactive
   → Header navigation = static links (no hydration)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
