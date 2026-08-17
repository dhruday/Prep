# 01 — Design Gmail (Frontend System Design)

> ⚡ **Quick Summary:** Gmail is a high-scale email client featuring virtual lists, real-time push notifications, complex threading, client-side search, and offline capabilities via Service Workers. The key challenges are rendering 50K+ emails efficiently and keeping UI fast while syncing with backend.

---

## 🧠 Mental Model
Think of Gmail as: **A document viewer (emails) + A search engine (find emails) + A notification system (new mail) + An offline cache (read without internet)**

---

## PART 1 — Problem Statement

### Business Requirements
- Users can send, receive, read, and organize emails
- Search emails quickly (Google's core competency)
- Works on slow mobile connections
- Accessible to users with disabilities (enterprise requirement)
- Revenue via Google Workspace (B2B) and ad targeting (B2C)

### Functional Requirements
- **Inbox:** View email list with sender, subject, preview, timestamp
- **Threading:** Group replies into conversations
- **Labels & Filters:** Organize emails automatically
- **Compose:** Rich text editor with attachments
- **Search:** Full-text search with filters (from:, after:, has:attachment)
- **Drafts:** Auto-save every 30 seconds
- **Notifications:** Real-time new email alerts
- **Infinite Scroll:** Load more emails as user scrolls

### Non-Functional Requirements
- **Performance:** FCP < 1.5s, inbox renders in < 500ms
- **Scale:** 1.8 billion users, 300 billion emails/day
- **Availability:** 99.9% uptime
- **Offline:** Read cached emails without internet
- **Accessibility:** WCAG AA compliant

### User Scale Assumptions
- 1.8 billion registered users
- 500 million DAU
- Average user: 50-100 emails visible in inbox
- Heavy users: 10,000+ emails in inbox

---

## PART 2 — Interviewer's Expectations

### What They Evaluate
- Can you handle rendering 10,000+ list items efficiently? (virtualization)
- Do you understand threading model complexity?
- Can you design offline-first with conflict resolution?
- Do you think about optimistic UI for send/label actions?
- Do you address accessibility for screen readers?

### Common Mistakes
- Rendering all emails in DOM (10K emails = browser crash)
- Not discussing debounce on search input
- Forgetting draft auto-save strategy
- Ignoring keyboard shortcuts (power user requirement)
- Not discussing attachment size limits / chunked uploads

### Red Flags
- "I'd just use a `<ul>` with all emails rendered"
- "Search would just hit the API on every keystroke"
- "Offline isn't important for email"

### Strong Signals
- Immediately mentions virtualization for email list
- Discusses delta sync (only sync changed emails, not all)
- Mentions optimistic UI for label/archive operations
- Knows the difference between IMAP push vs polling

### Staff-Level Signals
- Discusses **history API** to maintain scroll position on back navigation
- Mentions **email threading algorithm** (group by In-Reply-To header)
- Talks about **predictive prefetching** (preload email when cursor hovers)
- Discusses multi-account support architecture

---

## PART 3 — Requirement Questions to Ask

```
📌 SCALE
1. How many emails does the average user have? (50? 50K?)
2. What's the expected concurrent users at peak?
3. Single region or global?

📌 FEATURES
4. Full Gmail clone or MVP? (Search? Labels? Filters?)
5. Rich text compose or plain text only?
6. Attachment support? Max size?
7. Real-time notifications or polling acceptable?
8. Offline support required?

📌 TECHNICAL
9. Which frameworks/libraries are allowed?
10. Browser support requirements? (IE11? Safari iOS?)
11. Performance budget? (What's acceptable FCP?)
12. Existing backend APIs or design those too?

📌 BUSINESS
13. Consumer Gmail or Google Workspace (enterprise)?
14. Multi-account support needed?
15. Custom domain email support?
16. GDPR/compliance requirements?
```

---

## PART 4 — High-Level Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Route:     │  │  Route:      │  │  Route:          │  │
│  │  /inbox     │  │  /mail/:id   │  │  /search         │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                │                    │             │
│  ┌──────▼────────────────▼────────────────────▼──────────┐ │
│  │              APP SHELL (React)                         │ │
│  │   ┌────────────┐  ┌──────────┐  ┌─────────────────┐  │ │
│  │   │  Sidebar   │  │ Email    │  │  Reading Pane   │  │ │
│  │   │  (Labels)  │  │  List    │  │  (Thread View)  │  │ │
│  │   └────────────┘  │ Virtual  │  └─────────────────┘  │ │
│  │                   │  List    │                         │ │
│  │                   └──────────┘                         │ │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │              STATE LAYER                                │ │
│  │  React Query (server state)  +  Zustand (UI state)     │ │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
│  ┌────────────┐  ┌─────────▼──────────┐  ┌──────────────┐ │
│  │  Service   │  │    API Client      │  │  WebSocket   │ │
│  │  Worker    │  │   (Axios/Fetch)    │  │  (Push)      │ │
│  │ (Offline)  │  └────────────────────┘  └──────────────┘ │
│  └────────────┘                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                    (HTTPS + WSS)
                            │
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Not designed here)             │
│   Gmail API  │  Push API  │  Search Index  │  Auth (OAuth) │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Responsibility |
|-----------|----------------|
| `AppShell` | Layout, routing, global keyboard shortcuts |
| `Sidebar` | Labels list, compose button, storage quota |
| `EmailList` | Virtual scrolling container, selection state |
| `EmailRow` | Single email preview (sender, subject, date) |
| `ThreadView` | Email thread with expanded/collapsed messages |
| `ComposeModal` | Rich text editor, attachment, recipient input |
| `SearchBar` | Autocomplete, filter chips, search submit |
| `NotificationBell` | Real-time new mail indicator |

---

## PART 5 — Frontend Architecture

### Folder Structure
```
src/
├── features/
│   ├── inbox/
│   │   ├── InboxPage.tsx
│   │   ├── EmailList.tsx         ← virtual list lives here
│   │   ├── EmailRow.tsx
│   │   ├── hooks/
│   │   │   ├── useEmails.ts      ← React Query hook
│   │   │   └── useSelection.ts   ← checkbox selection state
│   │   └── store/
│   │       └── inboxSlice.ts
│   ├── thread/
│   │   ├── ThreadView.tsx
│   │   ├── EmailMessage.tsx
│   │   └── hooks/useThread.ts
│   ├── compose/
│   │   ├── ComposeModal.tsx
│   │   ├── RichTextEditor.tsx
│   │   └── AttachmentUpload.tsx
│   └── search/
│       ├── SearchPage.tsx
│       └── SearchFilters.tsx
├── components/
│   ├── VirtualList.tsx           ← reusable virtualized list
│   └── LabelChip.tsx
├── services/
│   ├── gmailApi.ts               ← Gmail REST API calls
│   └── pushNotification.ts       ← WebSocket/SSE handler
└── store/
    └── index.ts
```

### State Management

| State Type | Tool | Example |
|------------|------|---------|
| Server data (email list) | React Query | `useQuery(['emails', label], fetchEmails)` |
| Email thread data | React Query | `useQuery(['thread', id], fetchThread)` |
| Compose draft | Zustand | `useDraftStore()` |
| UI state (selected emails) | useState | `const [selected, setSelected] = useState(new Set())` |
| Search query params | URL params | `?q=from:boss&in:inbox` |

### Caching Strategy
```javascript
// React Query configuration for Gmail
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30 seconds fresh
      cacheTime: 5 * 60 * 1000,   // 5 min in memory
      refetchOnWindowFocus: true,   // sync when tab regains focus
    },
  },
});

// Optimistic updates for label changes
const labelMutation = useMutation(applyLabel, {
  onMutate: async ({ emailId, label }) => {
    await queryClient.cancelQueries(['emails']);
    const previous = queryClient.getQueryData(['emails']);
    queryClient.setQueryData(['emails'], old => 
      old.map(e => e.id === emailId ? { ...e, labels: [...e.labels, label] } : e)
    );
    return { previous }; // rollback context
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['emails'], context.previous); // rollback
  },
  onSettled: () => queryClient.invalidateQueries(['emails']),
});
```

### Draft Auto-Save
```javascript
// Auto-save draft every 30 seconds + on each meaningful change
const useDraftAutoSave = (draft) => {
  const saveDraft = useMutation(saveDraftAPI);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft.hasChanges) saveDraft.mutate(draft);
    }, 30_000); // 30 seconds
    return () => clearTimeout(timer);
  }, [draft]);

  // Also save on tab close
  useEffect(() => {
    const handleUnload = () => saveDraftAPI(draft); // sync call
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [draft]);
};
```

---

## PART 6 — Performance Engineering

### The Core Problem: 50,000 Emails in DOM = 💀

### Solution: Virtual Scrolling
```javascript
import { FixedSizeList } from 'react-window';

const EmailList = ({ emails }) => (
  <FixedSizeList
    height={600}           // visible container height
    itemCount={emails.length}
    itemSize={72}          // each email row height
    width="100%"
  >
    {({ index, style }) => (
      <EmailRow
        key={emails[index].id}
        email={emails[index]}
        style={style}        // MUST pass style for positioning
      />
    )}
  </FixedSizeList>
);
// Result: Only ~15 DOM nodes regardless of 50,000 emails ✅
```

### Initial Load Optimization
```
1. App Shell First:
   - Serve empty shell HTML instantly from CDN
   - Skeleton screens while data loads
   
2. Code Splitting:
   - ComposeModal → lazy loaded (not needed on initial load)
   - SearchPage → lazy loaded
   - RichTextEditor → lazy loaded (heavy library ~200KB)
   
3. Resource Hints:
   <link rel="preconnect" href="https://gmail.googleapis.com">
   <link rel="dns-prefetch" href="https://www.googleapis.com">
```

### Search Performance
```javascript
// Debounce search to avoid API call on every keystroke
const SearchBar = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300); // 300ms

  const { data } = useQuery(
    ['search', debouncedQuery],
    () => searchEmails(debouncedQuery),
    { enabled: debouncedQuery.length > 2 } // only search if 3+ chars
  );
  
  return <input onChange={e => setQuery(e.target.value)} />;
};
```

### Prefetching (Power Feature)
```javascript
// Preload email on hover (user likely to click)
const EmailRow = ({ email }) => {
  const queryClient = useQueryClient();
  
  const prefetch = () => {
    queryClient.prefetchQuery(
      ['thread', email.threadId],
      () => fetchThread(email.threadId),
      { staleTime: 60_000 }
    );
  };
  
  return (
    <div onMouseEnter={prefetch}>
      {email.subject}
    </div>
  );
};
```

### Bundle Splitting Strategy
```
Initial Bundle (~100KB):
  - App shell, routing, auth
  
Chunk: inbox (~80KB):
  - EmailList, EmailRow, VirtualList
  
Chunk: compose (~150KB):
  - RichTextEditor (Quill/TipTap is heavy)
  - File upload logic
  
Chunk: search (~60KB):
  - SearchFilters, SearchResults
  
Chunk: settings (~50KB):
  - Loaded only when user navigates to settings
```

---

## PART 7 — Scalability

### 10K Users — Simple
- Standard React app with React Query
- Email list virtualized (always do this)
- Basic polling every 30 seconds for new mail

### 100K Users — Optimize
- CDN for all static assets (JS, CSS, images)
- Email list pagination (50 emails per page)
- Smarter polling: exponential backoff
- Web Push Notifications via Service Worker

### 1M Users — Real-Time
- WebSocket connection for new email push
- Long Polling fallback for WebSocket failures
- Delta sync: only sync emails changed since last sync
- Service Worker caching: cache last 100 emails offline

### 100M Users — Platform (What Google Actually Does)
- **IMAP-like delta sync** with sequence numbers
- **Push via proprietary protocol** (not WebSocket — too much overhead)
- **Server-side rendering** for first email batch (instant display)
- **Predictive prefetching** with ML (knows you'll check email at 9am)
- **Edge caching** in 200+ PoPs globally
- **Separate micro-frontend** per feature (compose, search, inbox)

---

## PART 8 — Accessibility

### Email List
```html
<!-- Use proper list semantics -->
<ul role="list" aria-label="Inbox emails">
  <li role="listitem" aria-selected="false">
    <input type="checkbox" aria-label="Select email from John about Project Update" />
    <a href="/mail/abc123" aria-describedby="email-abc123-preview">
      Project Update
    </a>
    <span id="email-abc123-preview" class="sr-only">
      John sent: Here is the latest update on the project...
    </span>
  </li>
</ul>
```

### Keyboard Navigation
```
j / k           → Next / Previous email
Enter           → Open email
e               → Archive
#               → Delete
/ or Ctrl+K     → Focus search
c               → Compose
Escape          → Close modal/go back
Shift+?         → Show keyboard shortcuts help
```

### Live Regions for Notifications
```html
<!-- Announce new emails to screen readers -->
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
  class="sr-only"
>
  {newEmailCount > 0 && `${newEmailCount} new emails received`}
</div>
```

### Focus Management
```javascript
// When compose modal opens → focus first input
useEffect(() => {
  if (isOpen) {
    recipientInputRef.current?.focus();
  }
}, [isOpen]);

// When modal closes → return focus to trigger button
useEffect(() => {
  if (!isOpen) {
    composeButtonRef.current?.focus();
  }
}, [isOpen]);
```

---

## PART 9 — Security

### Authentication
```
OAuth 2.0 + OpenID Connect
- Access token: 1-hour lifetime, stored in httpOnly cookie
- Refresh token: 30-day lifetime, stored in httpOnly cookie
- PKCE flow for SPAs (no client secret needed)
- Token stored in httpOnly cookie (NOT localStorage)
```

### Email Content Security
```javascript
// Sanitize email HTML before rendering
import DOMPurify from 'dompurify';

const EmailBody = ({ htmlContent }) => {
  const clean = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt'],
    ALLOW_DATA_ATTR: false,
  });
  
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
};
```

### CSP Headers
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://gmail.googleapis.com wss://;
  frame-ancestors 'none';
```

### Attachment Security
```
- Scan attachments for malware on server-side (VirusTotal API)
- Never auto-execute attachments
- Warn on .exe, .bat, .js file downloads
- Render PDFs/images in sandboxed iframe
- Signed URLs for attachment downloads (expire after 1 hour)
```

---

## PART 10 — Offline Support

### Service Worker Strategy
```javascript
// Cache first for app shell, network first for emails
const CACHE_NAME = 'gmail-v1';

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/api/emails')) {
    // Network first → fallback to cache for emails
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache first for static assets
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});
```

### IndexedDB for Email Storage
```javascript
// Store last 200 emails for offline reading
const db = await openDB('gmail', 1, {
  upgrade(db) {
    const store = db.createObjectStore('emails', { keyPath: 'id' });
    store.createIndex('timestamp', 'timestamp');
    store.createIndex('label', 'labels', { multiEntry: true });
  },
});

// Store email
await db.put('emails', emailObject);

// Get cached emails when offline
const cachedEmails = await db.getAllFromIndex('emails', 'timestamp');
```

### Sync Strategy
```
Online → Normal API calls
Goes Offline → 
  - Show "Offline" badge in UI
  - Queue compose/send operations
  - Continue showing cached emails
  
Back Online →
  - Sync queued outbox (send pending emails)
  - Delta sync: get emails newer than last sync timestamp
  - Reconcile any conflicts (rare for email, server wins)
```

---

## PART 11 — Monitoring

### Key Metrics to Track
```javascript
// Web Vitals (Core experience metrics)
import { getCLS, getFID, getLCP, getFCP, TTFB } from 'web-vitals';

getCLS(metric => sendToAnalytics('CLS', metric.value));
getLCP(metric => sendToAnalytics('LCP', metric.value));
getFID(metric => sendToAnalytics('FID', metric.value));

// Custom Gmail metrics
trackMetric('inbox.time_to_first_email', Date.now() - navigationStart);
trackMetric('search.time_to_results', searchDuration);
trackMetric('compose.send_success_rate', success ? 1 : 0);
```

### Error Tracking
```javascript
// Sentry for error tracking
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1, // 10% of transactions
  beforeSend(event) {
    // Strip email content from error reports (privacy)
    if (event.extra?.emailContent) {
      event.extra.emailContent = '[REDACTED]';
    }
    return event;
  },
});
```

### Business Metrics
```
Track these in analytics:
- Emails sent per session
- Search success rate (did user click a result?)
- Compose abandon rate
- Label usage patterns
- Attachment send rate
- Mobile vs desktop split
```

---

## PART 12 — Trade-Off Analysis

### Virtual Scrolling vs. Pagination

| | Virtual Scroll | Pagination |
|--|----------------|------------|
| **UX** | Seamless, feels natural | Breaks flow, "page 3 of 50" |
| **Complexity** | Higher (dynamic heights tricky) | Simple |
| **Performance** | O(1) DOM nodes | O(n) per page load |
| **SEO** | Doesn't matter for auth apps | N/A |
| **When to use** | Large lists (100+ items) | Simple lists, mobile |
| **When not to** | If all items have dynamic height | Never for 10K+ items |

### WebSocket vs. Polling for New Mail

| | WebSocket | Polling |
|--|-----------|---------|
| **Latency** | Real-time (<1s) | Depends on interval |
| **Server load** | Connection per user | Stateless, easier scale |
| **Complexity** | Reconnection logic needed | Simple |
| **Battery** | Better (no wasted requests) | Drains battery |
| **Fallback** | Needs SSE or polling fallback | Self-contained |
| **When to use** | Chat, collaboration | Notifications, status |

**Gmail Actually Does:** Uses proprietary long-polling (not WebSocket) for new email notifications. Simple, reliable, scales well.

### Redux vs. React Query vs. Zustand

| | Redux | React Query | Zustand |
|--|-------|-------------|---------|
| **Best for** | Complex UI state | Server/async state | Simple global state |
| **Boilerplate** | High | Low | Very Low |
| **DevTools** | Excellent | Good | Good |
| **For Gmail** | Overkill for email data | Perfect for email list | For UI state (selection) |

**Winner for Gmail:** React Query (emails) + Zustand (UI state) + URL params (search)

---

## PART 13 — Follow-Up Questions

**Q: How do you handle threading in the email list?**
> A: Threading groups emails by the same `In-Reply-To` or `References` header values. On the frontend, you receive pre-grouped threads from the API. Each thread object contains `threadId`, `messages[]`, and `snippet` (last message preview). The EmailList renders threads (not individual emails). Clicking expands the thread showing all messages chronologically.

**Q: How do you implement offline search?**
> A: Two approaches: (1) Client-side search: download all email metadata (sender, subject, snippet) into IndexedDB and search in-browser using a lightweight engine like Fuse.js. Limited to cached emails. (2) Queue search: show cached results immediately, then show server results when connection resumes. Gmail uses approach (1) for cached emails and (2) for full search.

**Q: How do you handle attachment uploads efficiently?**
> A: Chunked upload via multipart upload: split files into 256KB chunks, upload sequentially or in parallel, track progress per chunk. On failure, resume from last successful chunk (resumable upload). Show progress bar with percentage. Cancel support by aborting the current chunk request.

**Q: How do you keep email list and unread count in sync?**
> A: Use a shared React Query cache. When user reads an email (`/thread/:id`), use `queryClient.setQueryData` to update the email's `read` flag in the inbox cache and decrement the count. This is optimistic — confirmed by background refetch.

**Q: How would you implement email filters/rules?**
> A: Filters run server-side on email ingestion. Frontend provides a rule builder UI: condition (from, subject, has-words) + action (label, archive, forward). Store rules in user settings API. Frontend validates rules, server executes them.

**Q: How do you handle very long email threads?**
> A: Collapse all messages except the last two. User clicks "Show N earlier messages" to expand. Within each message, truncate body after 3 lines with a "Show more" toggle. For very long single emails, paginate the HTML content or lazy-load the body.

**Q: How would you implement multiple account support?**
> A: Multiple account tokens stored in separate cookies/storage slots. Account switcher in top-right with avatar. Each account has its own React Query cache namespace (`[accountId, 'emails']`). Navigation switches between account contexts.

**Q: What happens if send fails?**
> A: Retry with exponential backoff (1s, 2s, 4s, max 3 retries). If all retries fail, show error toast with "Retry" button. Store failed sends in Outbox. On next connection attempt, retry automatically. For offline sends: queue in IndexedDB Outbox, sync when back online.

**Q: How do you implement search autocomplete?**
> A: Two sources: (1) Search history: store last 20 queries in localStorage, show on focus. (2) API autocomplete: debounced query to `/api/search/autocomplete` after 300ms. Show chips for email addresses, labels as autocomplete suggestions. Keyboard navigable with aria-listbox pattern.

**Q: How would you implement email snooze?**
> A: Client stores a snooze time in localStorage/IndexedDB. A background Service Worker timer (or server-side cron) removes the email from visible inbox until snooze time. When time arrives, SW shows a notification and un-snoozes the email (moves it back to inbox via API).

---

## PART 14 — Staff Engineer Deep Dive

### Architectural Evolution
```
Year 1: Monolithic React app
  - Single bundle, server-rendered initial state
  - Everything in one repo

Year 2: Feature isolation
  - Code splitting per feature
  - Shared component library extracted

Year 3: Micro frontends
  - Inbox, Compose, Search become separate MFEs
  - Deployed independently
  - Module Federation for shared utilities

Year 5: Edge-first
  - Personalized email list rendered at CDN edge
  - Streaming HTML response (React 18 Suspense)
  - ML-based prefetching
```

### Platform Strategy
- **Email as a Platform:** Inbox zero tools, plugins, extensions
- **Extension API:** Third-party apps (CRMs, calendars) integrate as right-panel sidebars
- **Design tokens:** Brand consistency across Gmail, Drive, Docs, Calendar
- **Web Worker offloading:** Email parsing, search indexing in background thread

### Long-Term Maintainability
- **Contract tests:** Frontend API contract tested separately from backend
- **Component isolation:** Storybook for every component with accessibility stories
- **Performance budgets:** CI fails if bundle increases by >5KB
- **Feature flags:** Every new feature behind a flag (LaunchDarkly or Statsig)
- **Deprecation policy:** Old API patterns marked, removed in 6-month cycles

---

## PART 15 — Production Reality

### What Gmail Actually Does
- **Not React** — Gmail is built with Closure Library + custom rendering engine (Mosaic)
- **SSR for first load** — Server pre-renders inbox HTML for instant display
- **Offline via gears** — Originally Google Gears, now Service Worker
- **"Inbox" experiment** → Was a separate app, proved learning → merged features back
- **Bundle: ~2MB+** — Gmail is large; they compensate with aggressive caching

### Common Anti-Patterns in Interview
1. **Not virtualizing** — "I'd render all emails in a `<ul>`" — instant red flag
2. **Search on every keystroke** — No debounce = API flood
3. **Storing tokens in localStorage** — XSS vulnerability
4. **Missing error states** — What shows when API is down?
5. **Ignoring compose auto-save** — Users lose work if they close tab

### Lessons Learned (From Real Teams)
- Email threading bugs are subtle: wrong thread grouping frustrates users more than any bug
- Attachment upload needs robust progress UI — users abandon if no feedback
- Keyboard shortcuts matter for power users — implement early, they complain loudly if missing
- Search relevance > search speed — showing wrong emails fast is worse than slower correct results

---

## PART 16 — Interview Summary

### ⏱️ 5-Minute Answer
> "Gmail has three hard frontend problems: rendering 50K+ emails without killing the browser, keeping data in sync in real-time, and working offline. I'd use a virtual list (react-window) so only ~20 DOM nodes exist regardless of email count. For real-time updates, I'd use WebSocket with a polling fallback. For offline, Service Workers cache the last 200 emails in IndexedDB. State-wise: React Query for server data, Zustand for UI state like selection. Search is debounced 300ms and hits a dedicated search endpoint. Everything is keyboard-navigable and WCAG AA compliant."

### ⏱️ 15-Minute Answer
Add to above:
> "For architecture: the app has an App Shell loaded from CDN, with three main views: Inbox (virtual list), Thread View (expanding thread), and Compose (lazy-loaded modal). Compose is lazy because it has a heavy rich text editor. I'd split the bundle by feature to keep initial load under 100KB.
>
> For threading: emails arrive pre-grouped by the API as thread objects. Clicking an email shows all messages in the thread. By default, all but the last 2 are collapsed.
>
> For labels: applying a label is optimistic — UI updates instantly, then API call fires. If it fails, we rollback with React Query's onError handler.
>
> For drafts: auto-save every 30 seconds using a debounced mutation, plus save on tab close via beforeunload event.
>
> For accessibility: the email list is a proper `<ul>` with ARIA labels per row, keyboard shortcuts (j/k/e/#), and a live region announcing new emails to screen readers.
>
> For security: JWT stored in httpOnly cookies (never localStorage), email HTML sanitized with DOMPurify, attachments scanned server-side, and CSP headers prevent script injection."

### ⏱️ 30-Minute Deep Dive
Add to above:
> "At 100M users, I'd evolve this into a micro-frontend platform. Inbox, Compose, Search, and Settings become independently deployed MFEs communicating via a shared event bus. The backend uses a push notification service (like Firebase Cloud Messaging) to push new email events to connected clients.
>
> For performance at scale: the first inbox render uses SSR — the server renders the first 50 emails server-side and streams HTML to the browser, so users see content before JavaScript loads. React then hydrates the page.
>
> I'd implement predictive prefetching: if a user consistently reads email at 9am, prefetch and cache at 8:50am.
>
> For monitoring: I'd track three tiers: (1) Core Web Vitals via RUM (LCP, FID, CLS), (2) Business metrics (send success rate, compose abandonment), (3) Error rate per feature via Sentry. Alerts fire if LCP degrades by 10% compared to yesterday's p95.
>
> For team scaling: each micro-frontend has a dedicated team of 4-6 engineers. The platform team owns the app shell, shared utilities, and release infrastructure. Contract tests between teams ensure API changes don't break consumers silently."

---

## 🎯 Interview Cheat Sheet

```
Gmail = Virtual List + React Query + WebSocket + Service Worker + DOMPurify

Key Numbers:
  Email row height: 72px
  Debounce search: 300ms
  Draft auto-save: 30 seconds
  Offline cache: 200 emails
  Token expiry: 1 hour (access) / 30 days (refresh)

Key Libraries:
  react-window      → Virtual list
  React Query       → Server state
  DOMPurify         → Sanitize email HTML
  Fuse.js           → Client-side search
  idb               → IndexedDB wrapper

Key Patterns:
  Optimistic UI     → Label/archive operations
  Debounce          → Search input (300ms)
  Chunked upload    → Large attachments
  Delta sync        → Only sync changed emails
  httpOnly cookies  → Secure token storage
```
