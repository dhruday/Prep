# Functional vs Non-Functional Requirements (Frontend)

## 1. High-Level Explanation (Frontend Interview Level)

When designing a frontend system, requirements fall into two categories: **Functional** (what the system does) and **Non-Functional** (how well the system does it).

Understanding this distinction is critical in system design interviews because:
- **Functional requirements** define features
- **Non-Functional requirements** define quality

### Functional Requirements - The "What"

**Definition:** Specific behaviors, features, or functions the system must have.

**Frontend Examples:**
- User can search for products
- User can add items to cart
- User can filter results by price
- System displays product images
- User receives notifications
- User can share posts
- System plays videos
- User can edit profile

**Characteristics:**
- ✅ Testable (either works or doesn't)
- ✅ Binary (feature exists or not)
- ✅ Visible to users
- ✅ Business-driven

### Non-Functional Requirements - The "How Well"

**Definition:** Quality attributes that define how the system performs.

**Frontend Examples:**
- Page loads in < 2 seconds (Performance)
- Works on mobile and desktop (Compatibility)
- Accessible to screen readers (Accessibility)
- Looks consistent across browsers (Reliability)
- Handles 1M concurrent users (Scalability)
- 99.9% uptime (Availability)
- Secure against XSS attacks (Security)
- Easy to maintain (Maintainability)

**Characteristics:**
- ✅ Measurable (metrics required)
- ✅ On a spectrum (not binary)
- ✅ Often invisible to users (until violated)
- ✅ Technical-driven

### Why Both Matter in Interviews

**Mid-Level Engineers:** Focus on functional requirements
```
"I'll implement search, filters, and cart"
```

**Senior/Staff Engineers:** Consider both equally
```
"I'll implement search (functional) with < 200ms response time 
(performance), works offline (availability), and accessible 
(a11y) for screen readers"
```

### Quick Comparison

| Aspect | Functional | Non-Functional |
|--------|-----------|----------------|
| **Answers** | "What does it do?" | "How well does it do it?" |
| **Example** | User can login | Login completes in < 1s |
| **Example** | Display search results | Results render with LCP < 2.5s |
| **Example** | Show notifications | Notifications work offline |
| **Testing** | Feature works or not | Measure metrics (time, score) |
| **In Interview** | Clarify features first | Then discuss quality attributes |
| **User Focus** | Visible functionality | Invisible quality (until bad) |
| **Requirement** | "User can upload images" | "Images < 5MB, < 3s upload time" |

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### The Frontend NFR Framework

Non-functional requirements for frontend systems can be organized into categories:

```
PERFORMANCE
├─ Load Time (FCP, LCP, TTI)
├─ Runtime Performance (FPS, responsiveness)
├─ Bundle Size (JS, CSS, images)
└─ Network Efficiency (API calls, payload size)

SCALABILITY
├─ User Scale (1K → 1M → 100M users)
├─ Data Scale (10 items → 10K items → 1M items)
├─ Geographic Scale (single region → global)
└─ Team Scale (1 engineer → 100 engineers)

RELIABILITY
├─ Uptime (99.9%, 99.99%)
├─ Error Rate (< 0.1%)
├─ Graceful Degradation
└─ Offline Support

USABILITY
├─ Responsive Design (mobile, tablet, desktop)
├─ Accessibility (WCAG 2.1 AA/AAA)
├─ Internationalization (i18n)
└─ User Experience (intuitive, consistent)

SECURITY
├─ Authentication/Authorization
├─ XSS Prevention
├─ CSRF Protection
├─ Data Encryption
└─ Secure Storage

MAINTAINABILITY
├─ Code Quality (readable, testable)
├─ Documentation (code, architecture)
├─ Test Coverage (unit, integration, e2e)
└─ Developer Experience

OBSERVABILITY
├─ Logging (errors, events)
├─ Monitoring (RUM, synthetic)
├─ Analytics (user behavior)
└─ Debugging (source maps, session replay)
```

### How to Extract Requirements in Interviews

#### Interview Scenario: "Design a photo-sharing app like Instagram"

**Step 1: Clarify Functional Requirements (5 minutes)**

```
You: "Let me clarify the functional requirements:

Core Features:
- Users can upload photos
- Users can view a feed of photos
- Users can like and comment on photos
- Users can follow other users
- Users can search for users/content

Additional Features (depends on scope):
- Stories (24-hour temporary content)
- Direct messaging
- Photo filters
- Multiple image posts (carousel)
- Video support

For this interview, should I focus on the core feed experience
or also include stories and messaging?"

Interviewer: "Focus on core feed: upload, view, like, comment"

You: "Got it. Now let me clarify non-functional requirements..."
```

**Step 2: Clarify Non-Functional Requirements (5 minutes)**

```
You: "Let me understand the quality attributes:

SCALE:
- How many users? (1M, 10M, 100M?)
- How many posts per user? (average)
- How many posts in feed? (per load)

PERFORMANCE:
- What's acceptable load time for feed? (< 2s, < 3s?)
- Image loading: Progressive or all-at-once?
- Acceptable time to first post?

DEVICES:
- Mobile-first, desktop-first, or equal?
- Support old browsers? (IE11?)
- Offline support needed?

GEOGRAPHY:
- Global audience or single region?
- Multiple languages?

CONSTRAINTS:
- Existing infrastructure? (React, Vue, Angular?)
- Timeline? (MVP or production-ready?)

Let me state my assumptions:
- 10M users, 1M daily active
- 20 posts per feed load
- Mobile-first (60% mobile, 40% desktop)
- Target: LCP < 2.5s, feed scrolling at 60 FPS
- Global audience (need i18n)
- No IE11 support
- Offline: view cached posts, queue uploads

Does this align with expectations?"

Interviewer: "Yes, that's a good starting point"
```

**What Makes This Senior-Level:**
- ✅ Asks specific quantifiable questions
- ✅ Clarifies constraints upfront
- ✅ States assumptions explicitly
- ✅ Connects NFRs to design decisions

---

### Translating Requirements to Design Decisions

#### Example 1: Performance Requirements Drive Architecture

**Requirement:** "Feed must load in < 2 seconds with LCP < 2.5s"

**Design Implications:**

```typescript
// Decision 1: Rendering Strategy
// Requirement → Design Choice

// ❌ Client-Side Rendering only
// - Slow initial load (download JS, fetch data)
// - LCP = 3-4 seconds (fails requirement)

// ✅ Server-Side Rendering for initial feed
// - HTML with first 10 posts pre-rendered
// - LCP = 1.5 seconds (meets requirement)
// - Client-side for interactions

export async function getServerSideProps() {
  const initialPosts = await fetchPosts(0, 10);
  
  return {
    props: { initialPosts },
  };
}

// Decision 2: Image Loading Strategy
// Requirement → Design Choice

// ❌ Load all images immediately
// - Blocks LCP (large images slow down page)
// - Wastes bandwidth (below-fold images)

// ✅ Progressive image loading
function FeedPost({ post }) {
  return (
    <img
      src={post.image.thumbnail}      // Low-res placeholder (5KB)
      data-src={post.image.full}      // Full-res (500KB)
      loading="lazy"                  // Lazy load below-fold
      onLoad={handleImageLoad}        // Swap to full-res
      width={640}
      height={640}
      alt={post.caption}
    />
  );
}

// Decision 3: Code Splitting
// Requirement → Design Choice

// Split by route to reduce initial bundle
const Feed = lazy(() => import('./Feed'));
const Profile = lazy(() => import('./Profile'));
const Upload = lazy(() => import('./Upload'));

// Result: Initial bundle 150KB → 50KB
// Load time: 2.5s → 1.2s ✅
```

---

#### Example 2: Scalability Requirements Drive State Management

**Requirement:** "Support 100M users, each with 1000+ posts in feed"

**Design Implications:**

```typescript
// Decision 1: Virtualization (Data Scale)
// Without virtualization: Render all 1000 posts = browser crash
// With virtualization: Render only 10 visible posts = smooth

import { FixedSizeList } from 'react-window';

function Feed({ posts }) {
  return (
    <FixedSizeList
      height={window.innerHeight}
      itemCount={posts.length}
      itemSize={600}
      width="100%"
    >
      {({ index, style }) => (
        <FeedPost
          key={posts[index].id}
          post={posts[index]}
          style={style}
        />
      )}
    </FixedSizeList>
  );
}

// Decision 2: Pagination Strategy (Network Scale)
// Requirement: Don't fetch all 1000 posts at once

// ❌ Fetch all posts upfront
// - 1000 posts × 1KB = 1MB payload
// - Slow on mobile networks
// - Wastes bandwidth

// ✅ Infinite scroll with pagination
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(
  'feed',
  ({ pageParam = 0 }) => fetchPosts(pageParam, 20),
  {
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.hasMore) {
        return pages.length * 20; // Next offset
      }
      return undefined;
    },
  }
);

// Decision 3: Caching Strategy (User Scale)
// Requirement: 100M users hitting API

// ✅ Aggressive caching
const { data } = useQuery('feed', fetchFeed, {
  staleTime: 300000,        // Fresh for 5 minutes
  cacheTime: 3600000,       // Keep in memory 1 hour
  refetchOnWindowFocus: true,
});

// Result: 100M users → 20M API calls (80% cache hit rate)
```

---

#### Example 3: Accessibility Requirements Drive Component Design

**Requirement:** "WCAG 2.1 AA compliance for accessibility"

**Design Implications:**

```typescript
// Decision 1: Semantic HTML
// Requirement → Implementation

// ❌ Divs everywhere (not accessible)
<div onClick={handleClick}>Submit</div>

// ✅ Semantic HTML
<button onClick={handleClick} aria-label="Submit post">
  Submit
</button>

// Decision 2: Keyboard Navigation
// Requirement: All features accessible via keyboard

function FeedPost({ post, onLike, onComment }) {
  const [focusedAction, setFocusedAction] = useState(null);
  
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'l':
        onLike(post.id);
        announceToScreenReader('Post liked');
        break;
      case 'c':
        onComment(post.id);
        break;
      case 'Tab':
        // Natural tab order is maintained
        break;
    }
  };
  
  return (
    <article
      role="article"
      aria-label={`Post by ${post.author}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <img
        src={post.image}
        alt={post.caption || 'User uploaded image'}
      />
      
      <div role="group" aria-label="Post actions">
        <button
          onClick={() => onLike(post.id)}
          aria-label={`Like post by ${post.author}`}
          aria-pressed={post.isLiked}
        >
          ❤️ {post.likes}
        </button>
        
        <button
          onClick={() => onComment(post.id)}
          aria-label={`Comment on post by ${post.author}`}
        >
          💬 {post.comments}
        </button>
      </div>
    </article>
  );
}

// Decision 3: Screen Reader Announcements
function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Decision 4: Color Contrast
// Requirement: 4.5:1 contrast ratio

const theme = {
  colors: {
    // ❌ Fails WCAG (3:1 contrast)
    primary: '#888888',
    background: '#ffffff',
    
    // ✅ Passes WCAG (7:1 contrast)
    primary: '#0066cc',
    background: '#ffffff',
  }
};
```

---

### Measuring Non-Functional Requirements

#### Performance Metrics

```typescript
// 1. Core Web Vitals (Google's standard)
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function measurePerformance() {
  // Largest Contentful Paint (LCP)
  // Target: < 2.5s (good), < 4s (needs improvement), > 4s (poor)
  getLCP((metric) => {
    console.log('LCP:', metric.value, 'ms');
    analytics.track('LCP', { value: metric.value });
    
    if (metric.value > 2500) {
      console.warn('LCP is slow:', metric.value);
      // Alert engineering team
    }
  });
  
  // First Input Delay (FID)
  // Target: < 100ms (good), < 300ms (needs improvement), > 300ms (poor)
  getFID((metric) => {
    console.log('FID:', metric.value, 'ms');
    if (metric.value > 100) {
      console.warn('Page not responsive:', metric.value);
    }
  });
  
  // Cumulative Layout Shift (CLS)
  // Target: < 0.1 (good), < 0.25 (needs improvement), > 0.25 (poor)
  getCLS((metric) => {
    console.log('CLS:', metric.value);
    if (metric.value > 0.1) {
      console.warn('Layout shifts detected:', metric.value);
    }
  });
  
  // First Contentful Paint (FCP)
  // Target: < 1.8s (good), < 3s (needs improvement), > 3s (poor)
  getFCP((metric) => {
    console.log('FCP:', metric.value, 'ms');
  });
}

// 2. Custom Performance Marks
performance.mark('feed-fetch-start');
const posts = await fetchFeed();
performance.mark('feed-fetch-end');
performance.measure('feed-fetch', 'feed-fetch-start', 'feed-fetch-end');

const feedFetchTime = performance.getEntriesByName('feed-fetch')[0].duration;
console.log('Feed fetch time:', feedFetchTime, 'ms');

// Requirement: < 500ms API response time
if (feedFetchTime > 500) {
  analytics.track('Slow API', { duration: feedFetchTime });
}

// 3. Bundle Size Monitoring
// In CI/CD pipeline
const bundleSize = fs.statSync('dist/main.js').size;
const maxBundleSize = 250 * 1024; // 250KB

if (bundleSize > maxBundleSize) {
  throw new Error(`Bundle size ${bundleSize} exceeds limit ${maxBundleSize}`);
}
```

#### Accessibility Metrics

```typescript
// 1. Automated Testing (Axe-core)
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Feed has no accessibility violations', async () => {
  const { container } = render(<Feed posts={mockPosts} />);
  const results = await axe(container);
  
  expect(results).toHaveNoViolations();
});

// 2. Manual Testing Checklist
const a11yChecklist = {
  keyboardNavigation: {
    description: 'All features accessible via keyboard',
    test: 'Tab through all interactive elements',
    requirement: 'WCAG 2.1.1',
  },
  screenReader: {
    description: 'Content readable by screen readers',
    test: 'Use NVDA/JAWS to navigate',
    requirement: 'WCAG 4.1.2',
  },
  colorContrast: {
    description: 'Text has sufficient contrast',
    test: 'Use contrast checker tool',
    requirement: 'WCAG 1.4.3 (4.5:1 ratio)',
  },
  focusVisible: {
    description: 'Focus indicator visible',
    test: 'Tab and verify focus outline',
    requirement: 'WCAG 2.4.7',
  },
};

// 3. Accessibility Score (Lighthouse)
// Run in CI/CD
const lighthouse = require('lighthouse');
const result = await lighthouse('https://app.example.com', {
  onlyCategories: ['accessibility'],
});

const a11yScore = result.lhr.categories.accessibility.score * 100;
console.log('Accessibility Score:', a11yScore);

// Requirement: > 90 score
if (a11yScore < 90) {
  throw new Error(`Accessibility score ${a11yScore} below threshold`);
}
```

---

### Common NFR Trade-offs

#### Trade-off 1: Performance vs Functionality

**Scenario:** Image filters (Instagram-style)

```typescript
// Functional Requirement: Apply 20+ filters to images
// Non-Functional Requirement: Filters apply instantly (< 100ms)

// Option 1: Client-side processing (Canvas API)
// ✅ Pro: Works offline, no server cost
// ❌ Con: Slow on low-end devices (500ms+)
// ❌ Con: Blocks main thread (janky UI)

function applyFilterClientSide(image, filter) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Apply filter (CPU-intensive)
  // Takes 200-500ms on mobile
  applyBrightnessFilter(ctx, image, filter.brightness);
  applyContrastFilter(ctx, image, filter.contrast);
  
  return canvas.toDataURL();
}

// Option 2: Server-side processing
// ✅ Pro: Fast (100ms), powerful servers
// ✅ Pro: Doesn't block UI
// ❌ Con: Requires network (doesn't work offline)
// ❌ Con: Server costs

async function applyFilterServerSide(image, filter) {
  const response = await fetch('/api/apply-filter', {
    method: 'POST',
    body: JSON.stringify({ image, filter }),
  });
  
  return response.json();
}

// Option 3: Web Worker (best of both)
// ✅ Pro: Works offline
// ✅ Pro: Doesn't block main thread
// ✅ Pro: Reasonable performance (150-300ms)
// ❌ Con: More complex implementation

const filterWorker = new Worker('filter-worker.js');

function applyFilterWorker(image, filter) {
  return new Promise((resolve) => {
    filterWorker.postMessage({ image, filter });
    
    filterWorker.onmessage = (e) => {
      resolve(e.data.filteredImage);
    };
  });
}

// Decision Matrix:
// - High-end devices: Client-side (fastest)
// - Low-end devices: Server-side (offload processing)
// - Offline: Web Worker (compromise)
```

#### Trade-off 2: Scalability vs Simplicity

**Scenario:** State management at scale

```typescript
// Functional Requirement: Manage feed state
// Non-Functional Requirement: Support 100 engineers working on codebase

// Option 1: React Context (Simple)
// ✅ Pro: Built-in, no dependencies
// ✅ Pro: Easy to understand
// ❌ Con: Causes unnecessary re-renders at scale
// ❌ Con: No devtools for debugging

const FeedContext = createContext();

function FeedProvider({ children }) {
  const [posts, setPosts] = useState([]);
  return (
    <FeedContext.Provider value={{ posts, setPosts }}>
      {children}
    </FeedContext.Provider>
  );
}

// Option 2: Redux (Scalable but complex)
// ✅ Pro: Predictable, debuggable
// ✅ Pro: Scales to large teams
// ❌ Con: Boilerplate-heavy
// ❌ Con: Steeper learning curve

const feedSlice = createSlice({
  name: 'feed',
  initialState: { posts: [], loading: false },
  reducers: {
    setPosts: (state, action) => {
      state.posts = action.payload;
    },
  },
});

// Option 3: React Query (Best for this use case)
// ✅ Pro: Optimized for server state
// ✅ Pro: Automatic caching, deduplication
// ✅ Pro: Minimal boilerplate
// ✅ Pro: Great devtools

const { data: posts } = useQuery('feed', fetchFeed, {
  staleTime: 60000,
  cacheTime: 300000,
});

// Decision:
// - Small app (< 10 components): Context
// - Large app with complex client state: Redux
// - Large app with mostly server state: React Query
```

---

## 3. Clear Real-World Examples

### Example 1: Netflix Homepage

#### Functional Requirements

```markdown
1. User can browse content
2. User can search for titles
3. User can play video
4. User can add to "My List"
5. User can see personalized recommendations
6. User can continue watching from last position
7. User can view trailers on hover
8. User can see ratings and reviews
```

#### Non-Functional Requirements

```markdown
PERFORMANCE
- Page load: LCP < 2.5s
- Video start: < 1s (time to first frame)
- Thumbnail hover: Preview starts < 500ms
- Smooth scrolling: 60 FPS

SCALABILITY
- Support 230M subscribers globally
- Handle 1M+ concurrent video streams
- Scale to 100K+ titles in catalog

RELIABILITY
- 99.99% uptime (4.38 minutes downtime/month)
- Graceful degradation (work without JS)
- Offline: View downloaded content

USABILITY
- Works on TV, mobile, tablet, desktop
- Accessible: WCAG 2.1 AA
- Supports 30+ languages
- Consistent experience across devices

SECURITY
- DRM for content protection
- Encrypted video streaming
- Secure authentication
- No credential leakage

MAINTAINABILITY
- Modular architecture (micro-frontends)
- 80%+ test coverage
- A/B testing framework
- Gradual rollout capability
```

#### How NFRs Drive Design

```typescript
// NFR: Video must start in < 1s
// Design Decision: Adaptive bitrate streaming

function VideoPlayer({ videoId }) {
  const [quality, setQuality] = useState('auto');
  
  useEffect(() => {
    const player = initializePlayer({
      // Start with low quality for fast start
      initialQuality: '360p',
      
      // Measure bandwidth and upgrade
      adaptiveBitrate: true,
      
      // Preload next chunk while playing
      preloadSegments: 3,
      
      // Target: < 1s to first frame
      targetStartTime: 1000,
    });
    
    return () => player.dispose();
  }, [videoId]);
  
  return <div id="video-player" />;
}

// NFR: Support 230M users
// Design Decision: CDN + edge caching

const videoManifest = {
  // Serve video from nearest edge location
  sources: [
    {
      url: 'https://cdn-us-west.netflix.com/video123.m3u8',
      region: 'us-west',
    },
    {
      url: 'https://cdn-eu-west.netflix.com/video123.m3u8',
      region: 'eu-west',
    },
  ],
};

// NFR: 60 FPS scrolling with 100K+ titles
// Design Decision: Virtual scrolling + lazy loading

function ContentRow({ titles }) {
  return (
    <VirtualScroller
      itemCount={titles.length}
      itemSize={300}
      renderItem={({ index, style }) => (
        <TitleCard
          key={titles[index].id}
          title={titles[index]}
          style={style}
          // Lazy load thumbnail
          loading="lazy"
        />
      )}
    />
  );
}
```

---

### Example 2: Google Docs

#### Functional Requirements

```markdown
1. User can create/edit documents
2. User can format text (bold, italic, etc.)
3. Multiple users can edit simultaneously (real-time collaboration)
4. User can comment on text
5. User can see edit history (version control)
6. User can share documents
7. User can work offline
8. Auto-save every few seconds
```

#### Non-Functional Requirements

```markdown
PERFORMANCE
- Typing latency: < 50ms
- Document load: < 2s
- Sync latency: < 200ms (collaborative editing)
- Smooth scrolling: 60 FPS with 100+ page document

SCALABILITY
- Support documents with 100K+ words
- Handle 50+ simultaneous editors
- Scale to 1B+ users globally

RELIABILITY
- 99.99% uptime
- No data loss (conflict resolution)
- Works offline (sync when online)
- Auto-save every 5 seconds

USABILITY
- Works on mobile, tablet, desktop
- Keyboard shortcuts for power users
- Accessible: Screen reader support
- Undo/redo unlimited levels

SECURITY
- End-to-end encryption (enterprise)
- Fine-grained permissions
- Audit log of all changes
- Prevent data leakage

CONSISTENCY
- Operational Transform for conflict resolution
- Eventual consistency across clients
- Deterministic merge
```

#### How NFRs Drive Design

```typescript
// NFR: Typing latency < 50ms
// Design Decision: Optimistic UI + CRDT

function Editor({ documentId }) {
  const [content, setContent] = useState('');
  const [syncState, setSyncState] = useState('synced');
  
  // Optimistic update (immediate UI feedback)
  const handleChange = (newContent) => {
    // Update UI immediately (< 50ms)
    setContent(newContent);
    setSyncState('syncing');
    
    // Send to server in background
    debouncedSync(newContent);
  };
  
  // Conflict resolution with Operational Transform
  const debouncedSync = useDebouncedCallback(async (content) => {
    try {
      const result = await syncDocument(documentId, {
        content,
        version: localVersion,
        operations: pendingOperations,
      });
      
      if (result.conflict) {
        // Resolve conflicts using OT
        const resolved = resolveConflict(content, result.serverContent);
        setContent(resolved);
      }
      
      setSyncState('synced');
    } catch (error) {
      setSyncState('error');
      // Queue for retry
      queueOfflineSync(content);
    }
  }, 1000);
  
  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
      />
      <SyncIndicator state={syncState} />
    </div>
  );
}

// NFR: Real-time collaboration (< 200ms sync)
// Design Decision: WebSocket + Operational Transform

function useCollaboration(documentId) {
  const ws = useWebSocket(`wss://docs.google.com/collab/${documentId}`);
  
  // Listen for changes from other users
  ws.onmessage = (event) => {
    const { operation, userId } = JSON.parse(event.data);
    
    // Apply operation to local document
    applyOperation(operation);
    
    // Show cursor position of other user
    showRemoteCursor(userId, operation.cursor);
  };
  
  // Broadcast local changes
  const broadcastChange = (operation) => {
    ws.send(JSON.stringify({
      type: 'operation',
      operation,
      userId: currentUserId,
      timestamp: Date.now(),
    }));
  };
  
  return { broadcastChange };
}

// NFR: Handle 100K+ word documents
// Design Decision: Virtual scrolling for pages

function DocumentViewer({ pages }) {
  return (
    <VirtualScroller
      itemCount={pages.length}
      itemSize={1056} // Page height
      renderItem={({ index }) => (
        <Page
          content={pages[index]}
          // Only render visible pages
          // Rest are placeholders
        />
      )}
    />
  );
}
```

---

### Example 3: Twitter Feed

#### Functional Requirements

```markdown
1. User can post tweets (280 characters)
2. User can view home timeline
3. User can like/retweet/reply
4. User can follow/unfollow users
5. User can view trending topics
6. User can search tweets
7. User can upload images/videos
8. User can see notifications
```

#### Non-Functional Requirements

```markdown
PERFORMANCE
- Tweet compose: < 100ms input latency
- Timeline load: < 2s
- Infinite scroll: 60 FPS
- Image upload: < 3s
- Search results: < 500ms

SCALABILITY
- Support 400M+ active users
- Handle 500M tweets per day
- Serve 6K tweets per second
- Global CDN distribution

RELIABILITY
- 99.95% uptime
- Graceful degradation (no JS fallback)
- Offline: View cached tweets, queue new tweets
- Rate limiting (tweet limits)

REAL-TIME
- New tweets appear within 1 second
- Like counts update in real-time
- Notifications delivered < 5s

USABILITY
- Responsive design (mobile-first)
- Accessible: WCAG 2.1 AA
- Keyboard shortcuts
- 40+ languages

SECURITY
- OAuth authentication
- XSS/CSRF protection
- Rate limiting (prevent spam)
- Content moderation
```

#### How NFRs Drive Design

```typescript
// NFR: New tweets appear within 1 second
// Design Decision: WebSocket + optimistic updates

function Timeline() {
  const [tweets, setTweets] = useState([]);
  
  // WebSocket for real-time updates
  useEffect(() => {
    const ws = new WebSocket('wss://twitter.com/stream');
    
    ws.onmessage = (event) => {
      const newTweet = JSON.parse(event.data);
      
      // Show "New tweets available" banner
      setHasNewTweets(true);
      
      // Don't auto-insert (would be jarring during scroll)
      // Let user click to load
    };
    
    return () => ws.close();
  }, []);
  
  return (
    <div>
      {hasNewTweets && (
        <button onClick={loadNewTweets}>
          Load new tweets
        </button>
      )}
      
      <InfiniteScroll
        tweets={tweets}
        onLoadMore={fetchOlderTweets}
      />
    </div>
  );
}

// NFR: Compose tweet with < 100ms latency
// Design Decision: Local state + debounced sync

function TweetComposer() {
  const [text, setText] = useState('');
  const [charCount, setCharCount] = useState(0);
  
  // Immediate UI update (< 100ms)
  const handleChange = (e) => {
    const newText = e.target.value;
    
    // Update immediately
    setText(newText);
    setCharCount(newText.length);
    
    // Save draft in background
    debouncedSaveDraft(newText);
  };
  
  // Debounced auto-save (doesn't block typing)
  const debouncedSaveDraft = useDebouncedCallback(async (text) => {
    await saveDraft(text);
  }, 1000);
  
  return (
    <div>
      <textarea
        value={text}
        onChange={handleChange}
        maxLength={280}
        placeholder="What's happening?"
      />
      <CharCounter current={charCount} max={280} />
    </div>
  );
}

// NFR: Infinite scroll at 60 FPS
// Design Decision: Virtual scrolling + Intersection Observer

function InfiniteScroll({ tweets, onLoadMore }) {
  const observerRef = useRef();
  const loadMoreRef = useRef();
  
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.5 }
    );
    
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
    
    return () => observerRef.current?.disconnect();
  }, [onLoadMore]);
  
  return (
    <VirtualList
      items={tweets}
      itemHeight={200}
      overscan={5}
      renderItem={(tweet) => <Tweet key={tweet.id} tweet={tweet} />}
      footer={<div ref={loadMoreRef}>Loading...</div>}
    />
  );
}

// NFR: Handle 500M tweets per day
// Design Decision: Optimistic UI + retry logic

function useTweetMutation() {
  return useMutation(
    async (tweetText) => {
      const response = await fetch('/api/tweets', {
        method: 'POST',
        body: JSON.stringify({ text: tweetText }),
      });
      
      if (!response.ok) throw new Error('Failed to post');
      
      return response.json();
    },
    {
      // Optimistic update
      onMutate: async (tweetText) => {
        const optimisticTweet = {
          id: `temp-${Date.now()}`,
          text: tweetText,
          author: currentUser,
          createdAt: new Date(),
          status: 'sending',
        };
        
        // Show immediately in timeline
        queryClient.setQueryData('timeline', (old) => [
          optimisticTweet,
          ...old,
        ]);
        
        return { optimisticTweet };
      },
      
      // On success, replace optimistic with real tweet
      onSuccess: (data, variables, context) => {
        queryClient.setQueryData('timeline', (old) =>
          old.map((tweet) =>
            tweet.id === context.optimisticTweet.id
              ? { ...data, status: 'sent' }
              : tweet
          )
        );
      },
      
      // On error, mark as failed, allow retry
      onError: (error, variables, context) => {
        queryClient.setQueryData('timeline', (old) =>
          old.map((tweet) =>
            tweet.id === context.optimisticTweet.id
              ? { ...tweet, status: 'failed' }
              : tweet
          )
        );
      },
      
      // Retry failed tweets
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );
}
```

---

## 4. Interview-Oriented Explanation

### Sample Interview Answer (7+ Years Experience)

**Question:** "How do you approach functional vs non-functional requirements in a system design interview?"

**Your Answer:**

> "I approach requirements in two phases:
>
> **Phase 1: Clarify Functional Requirements (5 minutes)**
> First, I nail down **what** the system does. For example, if designing Twitter:
> - 'Users can post tweets' (140/280 chars?)
> - 'Users can view timeline' (algorithmic or chronological?)
> - 'Users can like/retweet' (any engagement limits?)
> - 'Users can follow others' (follow limits?)
>
> This defines the **scope**. I don't want to spend 30 minutes designing DMs if the interviewer only cares about the feed.
>
> **Phase 2: Clarify Non-Functional Requirements (5 minutes)**
> Then I clarify **how well** it needs to work. This is where senior-level thinking shows:
>
> **Scale:**
> - 'How many users? Daily active users?'
> - 'How many tweets per second?'
> - 'Geographic distribution?'
>
> **Performance:**
> - 'What's acceptable load time? < 2s? < 3s?'
> - 'Real-time updates required?'
> - 'Offline support needed?'
>
> **Constraints:**
> - 'Target devices? Mobile-first?'
> - 'Browser support? (IE11 or modern only?)'
> - 'Existing tech stack?'
>
> **Example from my experience:**
> At [Company], PM asked for 'infinite scroll on the feed.' That's functional. But I asked:
> - 'How many posts per user?' (100 vs 10,000 changes design)
> - 'What's acceptable FPS during scroll?' (defines if we need virtualization)
> - 'Mobile performance requirements?' (affects image sizes, lazy loading)
>
> These NFRs led me to choose:
> - Virtual scrolling (handle 10K+ posts without memory issues)
> - Progressive image loading (mobile performance)
> - Intersection Observer (efficient scroll detection)
>
> **The key insight:**
> Functional requirements tell you **what to build**.
> Non-functional requirements tell you **how to architect it**.
>
> Mid-level engineers focus on features. Senior/staff engineers balance features with performance, scalability, and reliability. In interviews, asking about NFRs shows you think about production systems, not just demos."

---

### Common Interview Pitfalls

#### Pitfall 1: Ignoring NFRs Entirely

```
❌ Bad Interview:

Interviewer: "Design Instagram feed"

Candidate: "I'll use React and fetch posts from an API. 
I'll map over them and render them. Done."

Interviewer: "How does this scale?"

Candidate: "Uh... I'll add caching?"

→ No NFRs considered, no architecture discussion
```

```
✅ Good Interview:

Interviewer: "Design Instagram feed"

Candidate: "Let me clarify some requirements first.

Functional:
- Upload photos, view feed, like/comment - correct?

Non-functional:
- Scale: How many users? Posts per load?
- Performance: What's acceptable load time?
- Devices: Mobile-first or equal priority?

[After clarification]

Based on 10M users and LCP < 2.5s requirement, I'll design with:
1. SSR for initial load (performance)
2. Virtual scrolling (scale)
3. Progressive image loading (mobile performance)
4. CDN for images (global distribution)

Let me draw the architecture..."

→ Shows systematic thinking, considers production constraints
```

---

#### Pitfall 2: Vague NFRs

```
❌ Bad:

"The system should be fast"
→ What does "fast" mean?

"It should scale"
→ To how many users?

"It needs to be secure"
→ What specific threats?
```

```
✅ Good:

"Page load (LCP) < 2.5 seconds on 4G mobile"
→ Specific, measurable

"Support 1M concurrent users with < 500ms API response time"
→ Quantified scale

"Prevent XSS attacks via input sanitization and CSP headers"
→ Specific security measures
```

---

#### Pitfall 3: NFRs Without Justification

```
❌ Bad:

"I'll use React Query for caching"

Interviewer: "Why?"

Candidate: "Because it's good"

→ No reasoning
```

```
✅ Good:

"I'll use React Query for caching because:

1. NFR: Feed should load < 2s on repeat visits
2. React Query caches API responses for 5 minutes
3. 80% of users revisit feed within 5 minutes
4. Result: 80% cache hit rate → < 500ms load time

Alternative was manual caching with useState, but:
- More boilerplate
- No automatic revalidation
- No request deduplication

React Query solves all three for this use case."

→ Connects NFR to solution with data and trade-offs
```

---

### Checklist: NFRs to Always Ask About

**Performance:**
- ✅ What's acceptable page load time?
- ✅ What's acceptable API response time?
- ✅ Any specific Core Web Vitals targets?
- ✅ Real-time requirements?

**Scale:**
- ✅ How many users (current and projected)?
- ✅ How much data per user?
- ✅ Geographic distribution?
- ✅ Peak traffic patterns?

**Devices:**
- ✅ Mobile, desktop, or both?
- ✅ Browser support requirements?
- ✅ Network conditions (3G, 4G, fiber)?
- ✅ Offline support needed?

**Reliability:**
- ✅ Uptime requirements (99.9%, 99.99%)?
- ✅ Acceptable error rate?
- ✅ Graceful degradation strategy?

**Accessibility:**
- ✅ WCAG compliance level (A, AA, AAA)?
- ✅ Keyboard navigation required?
- ✅ Screen reader support?

**Security:**
- ✅ Authentication/authorization requirements?
- ✅ Data encryption needed?
- ✅ Specific threats to prevent (XSS, CSRF)?

---

## 5. Code Examples

### Example: Requirements → Implementation

**Scenario:** Shopping cart component

#### Functional Requirements

```markdown
1. User can add items to cart
2. User can remove items from cart
3. User can update quantities
4. User can see total price
5. Cart persists across sessions
```

#### Non-Functional Requirements

```markdown
PERFORMANCE
- Add to cart: < 100ms (optimistic update)
- Cart load: < 500ms

RELIABILITY
- No data loss (persist to localStorage and server)
- Offline support (queue actions)

USABILITY
- Accessible (screen reader, keyboard nav)
- Mobile-friendly

SCALABILITY
- Support 100+ items in cart
- Handle 10K+ concurrent users
```

#### Implementation

```typescript
/**
 * Shopping Cart Component
 * Implements functional and non-functional requirements
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

// ─────────────────────────────────────────────────────
// FUNCTIONAL REQUIREMENT: Add/Remove/Update items
// NFR: < 100ms (optimistic updates)
// ─────────────────────────────────────────────────────

function useCart() {
  const queryClient = useQueryClient();
  
  // Load cart from server (with cache)
  const { data: cart, isLoading } = useQuery(
    ['cart'],
    fetchCart,
    {
      staleTime: 60000, // Fresh for 1 minute
      initialData: () => {
        // NFR: Persist across sessions
        const cached = localStorage.getItem('cart');
        return cached ? JSON.parse(cached) : { items: [] };
      },
    }
  );
  
  // Add to cart mutation
  const addMutation = useMutation(
    async (item: CartItem) => {
      return await fetch('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify(item),
      }).then(r => r.json());
    },
    {
      // NFR: < 100ms (optimistic update)
      onMutate: async (newItem) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries(['cart']);
        
        // Snapshot previous cart
        const previousCart = queryClient.getQueryData(['cart']);
        
        // Optimistically update cart (instant UI)
        queryClient.setQueryData(['cart'], (old: any) => {
          const existingItem = old.items.find((i: CartItem) => i.id === newItem.id);
          
          if (existingItem) {
            // Increment quantity
            return {
              ...old,
              items: old.items.map((i: CartItem) =>
                i.id === newItem.id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          } else {
            // Add new item
            return {
              ...old,
              items: [...old.items, { ...newItem, quantity: 1 }],
            };
          }
        });
        
        // NFR: Persist across sessions
        const updatedCart = queryClient.getQueryData(['cart']);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        
        return { previousCart };
      },
      
      // Rollback on error (reliability)
      onError: (err, variables, context) => {
        queryClient.setQueryData(['cart'], context?.previousCart);
        toast.error('Failed to add to cart');
      },
      
      // Sync with server
      onSettled: () => {
        queryClient.invalidateQueries(['cart']);
      },
    }
  );
  
  // Remove from cart
  const removeMutation = useMutation(
    async (itemId: string) => {
      return await fetch(`/api/cart/remove/${itemId}`, {
        method: 'DELETE',
      });
    },
    {
      onMutate: async (itemId) => {
        await queryClient.cancelQueries(['cart']);
        const previousCart = queryClient.getQueryData(['cart']);
        
        queryClient.setQueryData(['cart'], (old: any) => ({
          ...old,
          items: old.items.filter((i: CartItem) => i.id !== itemId),
        }));
        
        return { previousCart };
      },
      onError: (err, variables, context) => {
        queryClient.setQueryData(['cart'], context?.previousCart);
      },
      onSettled: () => {
        queryClient.invalidateQueries(['cart']);
      },
    }
  );
  
  // Update quantity
  const updateQuantityMutation = useMutation(
    async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      return await fetch('/api/cart/update', {
        method: 'PUT',
        body: JSON.stringify({ itemId, quantity }),
      });
    },
    {
      onMutate: async ({ itemId, quantity }) => {
        await queryClient.cancelQueries(['cart']);
        const previousCart = queryClient.getQueryData(['cart']);
        
        queryClient.setQueryData(['cart'], (old: any) => ({
          ...old,
          items: old.items.map((i: CartItem) =>
            i.id === itemId ? { ...i, quantity } : i
          ),
        }));
        
        return { previousCart };
      },
      onError: (err, variables, context) => {
        queryClient.setQueryData(['cart'], context?.previousCart);
      },
      onSettled: () => {
        queryClient.invalidateQueries(['cart']);
      },
    }
  );
  
  return {
    cart,
    isLoading,
    addItem: addMutation.mutate,
    removeItem: removeMutation.mutate,
    updateQuantity: updateQuantityMutation.mutate,
  };
}

// ─────────────────────────────────────────────────────
// FUNCTIONAL REQUIREMENT: Display cart
// NFR: Accessible, mobile-friendly
// ─────────────────────────────────────────────────────

function ShoppingCart() {
  const { cart, isLoading, removeItem, updateQuantity } = useCart();
  
  if (isLoading) {
    return (
      <div role="status" aria-live="polite">
        <Skeleton count={3} />
        <span className="sr-only">Loading cart...</span>
      </div>
    );
  }
  
  if (cart.items.length === 0) {
    return (
      <div className="empty-cart">
        <p>Your cart is empty</p>
        <a href="/shop">Start shopping</a>
      </div>
    );
  }
  
  // FUNCTIONAL: Calculate total price
  const total = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  return (
    <section
      className="shopping-cart"
      role="region"
      aria-label="Shopping cart"
    >
      <h2>Shopping Cart ({cart.items.length} items)</h2>
      
      {/* NFR: ACCESSIBLE - Use proper list semantics */}
      <ul className="cart-items" role="list">
        {cart.items.map((item) => (
          <li
            key={item.id}
            className="cart-item"
            role="listitem"
          >
            <img
              src={item.image}
              alt={item.name}
              width={80}
              height={80}
              loading="lazy"
            />
            
            <div className="cart-item__details">
              <h3>{item.name}</h3>
              <p>${item.price.toFixed(2)}</p>
            </div>
            
            {/* NFR: ACCESSIBLE - Quantity controls */}
            <div className="cart-item__quantity" role="group" aria-label="Quantity controls">
              <button
                onClick={() => updateQuantity({
                  itemId: item.id,
                  quantity: Math.max(1, item.quantity - 1),
                })}
                aria-label={`Decrease quantity of ${item.name}`}
                disabled={item.quantity === 1}
              >
                -
              </button>
              
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateQuantity({
                  itemId: item.id,
                  quantity: parseInt(e.target.value) || 1,
                })}
                min={1}
                max={99}
                aria-label={`Quantity of ${item.name}`}
              />
              
              <button
                onClick={() => updateQuantity({
                  itemId: item.id,
                  quantity: item.quantity + 1,
                })}
                aria-label={`Increase quantity of ${item.name}`}
              >
                +
              </button>
            </div>
            
            {/* NFR: ACCESSIBLE - Remove button */}
            <button
              onClick={() => removeItem(item.id)}
              className="cart-item__remove"
              aria-label={`Remove ${item.name} from cart`}
            >
              <TrashIcon aria-hidden="true" />
              Remove
            </button>
          </li>
        ))}
      </ul>
      
      {/* FUNCTIONAL: Show total */}
      <div className="cart-summary">
        <div className="cart-summary__total">
          <span>Total:</span>
          <span
            className="cart-summary__amount"
            aria-label={`Total amount: $${total.toFixed(2)}`}
          >
            ${total.toFixed(2)}
          </span>
        </div>
        
        <button
          className="cart-summary__checkout"
          onClick={() => navigateToCheckout()}
        >
          Proceed to Checkout
        </button>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────
// NFR: OFFLINE SUPPORT - Queue actions
// ─────────────────────────────────────────────────────

function useOfflineQueue() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Process queued actions
      processQueue();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const addToQueue = (action: any) => {
    setQueue((prev) => [...prev, action]);
    localStorage.setItem('offline-queue', JSON.stringify([...queue, action]));
  };
  
  const processQueue = async () => {
    for (const action of queue) {
      try {
        await fetch(action.url, {
          method: action.method,
          body: action.body,
        });
      } catch (error) {
        console.error('Failed to process queued action:', error);
      }
    }
    
    setQueue([]);
    localStorage.removeItem('offline-queue');
  };
  
  return { isOnline, addToQueue };
}

// ─────────────────────────────────────────────────────
// NFR: PERFORMANCE MONITORING
// ─────────────────────────────────────────────────────

function measureCartPerformance() {
  // Measure add to cart performance
  performance.mark('cart-add-start');
  
  // ... add to cart logic
  
  performance.mark('cart-add-end');
  performance.measure('cart-add', 'cart-add-start', 'cart-add-end');
  
  const measure = performance.getEntriesByName('cart-add')[0];
  
  // NFR: Add to cart < 100ms
  if (measure.duration > 100) {
    console.warn(`Cart add slow: ${measure.duration}ms`);
    analytics.track('Slow Cart Add', { duration: measure.duration });
  }
}

// ─────────────────────────────────────────────────────
// TESTS: Verify functional and non-functional requirements
// ─────────────────────────────────────────────────────

describe('ShoppingCart', () => {
  // FUNCTIONAL TEST: Add item to cart
  it('adds item to cart', async () => {
    const { user } = render(<ShoppingCart />);
    
    await user.click(screen.getByRole('button', { name: /add to cart/i }));
    
    expect(screen.getByText(/1 item/i)).toBeInTheDocument();
  });
  
  // NFR TEST: Performance (optimistic update)
  it('adds item optimistically (< 100ms)', async () => {
    const start = performance.now();
    
    const { user } = render(<ShoppingCart />);
    await user.click(screen.getByRole('button', { name: /add to cart/i }));
    
    // Item should appear immediately
    expect(screen.getByText(/1 item/i)).toBeInTheDocument();
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
  
  // NFR TEST: Accessibility (keyboard navigation)
  it('is keyboard accessible', async () => {
    const { user } = render(<ShoppingCart />);
    
    // Tab through interactive elements
    await user.tab();
    expect(screen.getByRole('button', { name: /decrease quantity/i })).toHaveFocus();
    
    await user.tab();
    expect(screen.getByRole('spinbutton')).toHaveFocus();
    
    // All interactive elements should be reachable via keyboard
  });
  
  // NFR TEST: Reliability (offline support)
  it('queues actions when offline', async () => {
    // Simulate offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    const { user } = render(<ShoppingCart />);
    await user.click(screen.getByRole('button', { name: /add to cart/i }));
    
    // Action should be queued
    const queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
    expect(queue).toHaveLength(1);
  });
});
```

---

## 6. Why & How Summary

### Why Both Matter

**Functional Requirements (What):**
- Define product features
- Visible to users
- Business-driven
- Binary (works or doesn't)

**Non-Functional Requirements (How Well):**
- Define quality attributes
- Often invisible (until violated)
- Engineering-driven
- Measurable (on a spectrum)

**Together:**
- Functional without NFRs = Features that don't scale
- NFRs without functional = Optimizing nothing
- Both = Production-ready system

### How to Use in Interviews

**1. Always Clarify Both**
```
"Let me clarify functional requirements: [features]
And non-functional: [performance, scale, reliability]"
```

**2. Connect NFRs to Design Decisions**
```
"Because we need LCP < 2.5s (NFR), I'm choosing SSR (design)"
```

**3. Quantify When Possible**
```
Not: "Should be fast"
But: "< 2s page load, < 500ms API response"
```

**4. Discuss Trade-offs**
```
"SSR improves performance but adds server complexity.
Given our NFR of < 2s load time, the trade-off is worth it."
```

**5. Show Production Awareness**
```
"For reliability, I'd add error tracking, retry logic, and graceful degradation"
```

---

## Interview Confidence Boosters

### Quick Reference Card

**When interviewer says: "Design X"**

Step 1: Clarify Functional (5 mins)
- "What features exactly?"
- "Any priorities?"
- "Scope for this interview?"

Step 2: Clarify Non-Functional (5 mins)
- "Scale: How many users?"
- "Performance: What's acceptable?"
- "Devices: Mobile/desktop?"
- "Constraints: Tech stack? Timeline?"

Step 3: Design with NFRs in Mind
- Connect each major decision to an NFR
- Explain trade-offs
- Quantify when possible

### Common NFRs by System Type

**E-Commerce:**
- Performance: LCP < 2.5s (conversion rate)
- Security: PCI compliance
- Reliability: 99.99% uptime (revenue loss)

**Social Media:**
- Real-time: < 1s update latency
- Scale: 100M+ users
- Performance: 60 FPS scrolling

**Dashboard:**
- Performance: < 500ms data refresh
- Real-time: WebSocket updates
- Usability: Works on all screen sizes

**Content Site:**
- Performance: LCP < 2s (SEO)
- SEO: SSR/SSG required
- Accessibility: WCAG 2.1 AA

---

**Next Topic:** Trade-offs Over Perfect UI
