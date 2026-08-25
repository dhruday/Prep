# Microsoft — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Software Engineer — Frontend |
| **Level** | L63 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Medium](https://medium.com/tag/microsoft-interview) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone Screen + 2 Frontend Technical + 1 Hiring Manager)
- **Timeline:** 3 weeks
- **Format:** Virtual (Teams)
- **Note:** Microsoft Frontend interviews test both React and vanilla JavaScript + TypeScript

---

## Round 1: Phone Screen
**Duration:** 45 minutes | **Interviewer:** L62 SDE

### Questions Asked
1. **Implement a custom `useDebounce` hook in React**
2. **Follow-up: `usePrevious` hook**

### 💡 Interview-Ready Answer — useDebounce

```typescript
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        
        return () => clearTimeout(handler); // cleanup on value change
    }, [value, delay]);
    
    return debouncedValue;
}

// Usage:
// const [searchTerm, setSearchTerm] = useState('');
// const debouncedSearch = useDebounce(searchTerm, 300);
// useEffect(() => { fetchResults(debouncedSearch); }, [debouncedSearch]);

// Callback version (for event handlers):
function useDebouncedCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number,
    deps: DependencyList
): T {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;
    
    const timerRef = useRef<NodeJS.Timeout>();
    
    const debouncedFn = useCallback((...args: Parameters<T>) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay, ...deps]) as T;
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);
    
    return debouncedFn;
}
```

### 💡 Interview-Ready Answer — usePrevious

```typescript
function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();
    
    useEffect(() => {
        ref.current = value;
    }); // runs AFTER render, so ref still holds the previous value during render
    
    return ref.current;
}

// Usage:
// const prevCount = usePrevious(count);
// console.log(`Count changed from ${prevCount} to ${count}`);

// Why it works:
// 1. Component renders with new value
// 2. During render, ref.current still holds OLD value (returned to user)
// 3. After render, useEffect runs and updates ref.current to new value
// 4. Next render: ref.current = current render's value = "previous" for that render
```

---

## Round 2: Frontend Technical — Component Design
**Duration:** 60 minutes | **Interviewer:** L63 SDE

### Questions Asked
1. **Build a Virtual Scrolling List component**
   - Render 100K items performantly, fixed-height rows

### 💡 Interview-Ready Answer

```tsx
interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    containerHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    overscan?: number; // extra items rendered above/below viewport
}

function VirtualList<T>({ items, itemHeight, containerHeight, renderItem, overscan = 5 }: VirtualListProps<T>) {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Calculate visible range
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);
    
    const visibleItems = useMemo(() => {
        return items.slice(startIndex, endIndex).map((item, i) => ({
            item,
            index: startIndex + i,
            style: {
                position: 'absolute' as const,
                top: (startIndex + i) * itemHeight,
                height: itemHeight,
                width: '100%',
            }
        }));
    }, [items, startIndex, endIndex, itemHeight]);
    
    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            style={{ height: containerHeight, overflow: 'auto', position: 'relative' }}
            role="list"
        >
            {/* Spacer to maintain scroll height */}
            <div style={{ height: totalHeight, position: 'relative' }}>
                {visibleItems.map(({ item, index, style }) => (
                    <div key={index} style={style} role="listitem">
                        {renderItem(item, index)}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Usage:
// <VirtualList
//     items={hugeArray}
//     itemHeight={50}
//     containerHeight={600}
//     renderItem={(item, idx) => <div>{item.name}</div>}
// />
```

**Variable Height Rows (advanced follow-up):**
```tsx
// For variable heights, maintain a heights map + prefix sum array
// Use ResizeObserver to measure actual heights after initial render
// Update prefix sum → recalculate positions

class HeightCache {
    estimatedHeight: number;
    measuredHeights: Map<number, number> = new Map();
    
    getHeight(index: number): number {
        return this.measuredHeights.get(index) ?? this.estimatedHeight;
    }
    
    getOffset(index: number): number {
        let offset = 0;
        for (let i = 0; i < index; i++) {
            offset += this.getHeight(i);
        }
        return offset; // In practice, use binary search on prefix sums
    }
    
    setMeasuredHeight(index: number, height: number) {
        this.measuredHeights.set(index, height);
    }
}
```

---

## Round 3: Frontend Technical — System Design
**Duration:** 60 minutes | **Interviewer:** Principal SDE

### Questions Asked
1. **Design Microsoft Outlook Web — Email Client**
   - Inbox, compose, search, folders, real-time notifications, offline support

### 💡 Interview-Ready Answer

#### Component Architecture
```
┌──────────────────────────────────────────────────────────┐
│  OutlookApp                                               │
│  ├── AppShell (layout, routing)                          │
│  │   ├── Sidebar                                         │
│  │   │   ├── FolderTree (Inbox, Sent, Drafts, custom)   │
│  │   │   └── CalendarMini                                │
│  │   ├── EmailList (virtualized)                         │
│  │   │   ├── SearchBar                                   │
│  │   │   ├── FilterBar (Unread, Flagged, Mentioned)     │
│  │   │   └── EmailListItem[] (virtual scroll)           │
│  │   ├── ReadingPane                                     │
│  │   │   ├── EmailHeader (from, to, subject, date)      │
│  │   │   ├── EmailBody (HTML renderer, sanitized)       │
│  │   │   ├── AttachmentList                              │
│  │   │   └── QuickReply                                 │
│  │   └── ComposeModal                                    │
│  │       ├── RecipientField (autocomplete, chips)       │
│  │       ├── SubjectInput                                │
│  │       ├── RichTextEditor (formatting toolbar)        │
│  │       ├── AttachmentUploader                          │
│  │       └── SendButton                                  │
│  └── NotificationToast (real-time new email alerts)      │
└──────────────────────────────────────────────────────────┘
```

#### State Management
```typescript
// Using a normalized store (like Redux Toolkit)
interface EmailState {
    // Normalized entities
    emails: Record<string, Email>;
    folders: Record<string, Folder>;
    
    // UI state
    selectedFolderId: string;
    selectedEmailId: string | null;
    searchQuery: string;
    
    // Pagination
    folderCursors: Record<string, string>; // folderId → cursor for next page
    hasMore: Record<string, boolean>;
    
    // Compose
    drafts: Record<string, Draft>;
    activeDraftId: string | null;
    
    // Offline
    pendingActions: PendingAction[]; // queue for offline operations
    syncStatus: 'synced' | 'syncing' | 'offline';
}

// Why normalized store?
// 1. Same email referenced in multiple views (inbox, search results, thread)
// 2. Update in one place → reflected everywhere
// 3. Avoid deeply nested state (folders → emails → attachments)
```

#### Offline Support with Service Worker
```typescript
// Service Worker Strategy: Network-first with fallback to cache

// Register SW
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

// sw.js
self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('/api/emails')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache successful responses
                    const clone = response.clone();
                    caches.open('emails-v1').then(cache => {
                        cache.put(event.request, clone);
                    });
                    return response;
                })
                .catch(() => {
                    // Offline: return cached version
                    return caches.match(event.request);
                })
        );
    }
});

// IndexedDB for offline email storage
class OfflineEmailStore {
    private db: IDBDatabase;
    
    async init() {
        this.db = await openDB('outlook-offline', 1, {
            upgrade(db) {
                const store = db.createObjectStore('emails', { keyPath: 'id' });
                store.createIndex('folderId', 'folderId');
                store.createIndex('date', 'receivedDate');
                
                db.createObjectStore('pendingActions', { autoIncrement: true });
            }
        });
    }
    
    async getEmails(folderId: string, limit: number): Promise<Email[]> {
        const tx = this.db.transaction('emails', 'readonly');
        const index = tx.objectStore('emails').index('folderId');
        return index.getAll(IDBKeyRange.only(folderId), limit);
    }
    
    // Queue offline actions (send, delete, move, flag)
    async queueAction(action: PendingAction) {
        const tx = this.db.transaction('pendingActions', 'readwrite');
        await tx.objectStore('pendingActions').add(action);
    }
    
    // Sync when back online
    async syncPendingActions() {
        const tx = this.db.transaction('pendingActions', 'readwrite');
        const store = tx.objectStore('pendingActions');
        const actions = await store.getAll();
        
        for (const action of actions) {
            try {
                await fetch(action.url, { method: action.method, body: action.body });
                await store.delete(action.id);
            } catch {
                break; // still offline, stop trying
            }
        }
    }
}
```

#### Email HTML Rendering (Security)
```typescript
// CRITICAL: Never render raw email HTML — XSS risk!

function sanitizeEmailHTML(rawHTML: string): string {
    // Use DOMPurify library
    return DOMPurify.sanitize(rawHTML, {
        ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'a', 'img', 'table', 'tr', 'td', 
                       'th', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'span', 'div', 'blockquote'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'class', 'colspan', 'rowspan'],
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
        FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
        ADD_ATTR: ['target'], // all links open in new tab
    });
}

// Render in sandboxed iframe for extra safety
function EmailBody({ html }: { html: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    
    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            doc?.write(sanitizeEmailHTML(html));
            doc?.close();
        }
    }, [html]);
    
    return <iframe ref={iframeRef} sandbox="allow-same-origin" />;
}
```

---

## Round 4: Hiring Manager
**Duration:** 45 minutes

### Questions Asked
1. **"How do you approach accessibility in web applications?"**
2. **"Tell me about a time you improved team velocity"**
3. **"How do you stay current with rapidly evolving frontend technologies?"**

### 💡 Interview-Ready Answer — Accessibility Approach

> "I follow a three-layer accessibility strategy:
> 
> **Layer 1: Automated** — ESLint plugins (eslint-plugin-jsx-a11y), Lighthouse accessibility audit in CI, axe-core in integration tests. These catch ~30% of issues automatically.
> 
> **Layer 2: Manual Testing** — Tab through every feature with keyboard only. Test with VoiceOver (Mac) and NVDA (Windows). Check color contrast ratios (4.5:1 for text, 3:1 for large text). Verify focus management on route changes and modal opens.
> 
> **Layer 3: Design System** — Built accessible primitives (Button, Dialog, Combobox, Tabs) once with proper ARIA attributes, focus trapping, and keyboard interactions. All teams use these instead of rolling their own. This prevents 80% of a11y issues at the source."

---

## 🎯 Key Takeaways
- Microsoft Frontend interviews test **both React hooks and vanilla JS** — don't rely on frameworks alone
- **Virtual Scrolling** is a signature Microsoft question — know both fixed and variable height implementations
- **Outlook Web** design tests offline-first architecture, Service Workers, and IndexedDB
- **useDebounce and usePrevious** are custom hook staples — practice writing them from scratch
- **Email HTML sanitization** is a security-critical topic — mention DOMPurify and sandboxed iframes
- **Accessibility** is a core Microsoft value — have concrete strategies, not just "we add ARIA labels"
- TypeScript is expected at Microsoft — write typed code, not plain JavaScript

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Custom Hooks, useRef, useEffect |
| Round 2 | Hard | Virtual Scrolling, Performance |
| Round 3 | Very Hard | Offline-First, Service Workers, Security |
| Round 4 | Medium | Behavioral, a11y, Leadership |
