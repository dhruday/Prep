# LinkedIn — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Staff Frontend Engineer |
| **Level** | Senior (E5) |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Coding + Machine Coding + System Design + Behavioral)
- **Timeline:** 2 weeks

---

## Round 1: JavaScript Coding
**Duration:** 45 minutes

### Questions Asked
1. **Implement Promise.race with timeout**
2. **Implement a robust retry mechanism with abort support**

### 💡 Promise.race with Timeout

```javascript
function promiseWithTimeout(promise, timeoutMs, timeoutError = 'Timeout') {
  let timeoutId;
  
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutError));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId); // Always clean up timer
  });
}

// Usage:
const result = await promiseWithTimeout(
  fetch('/api/data'),
  5000,
  'Request timed out after 5 seconds'
);
```

### 💡 Retry with Abort

```javascript
function retryWithAbort(fn, options = {}) {
  const {
    maxRetries = 3,
    backoff = (attempt) => Math.min(1000 * Math.pow(2, attempt), 30000),
    shouldRetry = (error) => true, // Retry on all errors by default
    onRetry = () => {},
  } = options;
  
  const abortController = new AbortController();
  
  const execute = async () => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (abortController.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      
      try {
        return await fn(abortController.signal, attempt);
      } catch (error) {
        lastError = error;
        
        // Don't retry on abort
        if (error.name === 'AbortError') throw error;
        
        // Check if we should retry this error
        if (attempt < maxRetries && shouldRetry(error)) {
          const delay = backoff(attempt);
          onRetry({ attempt: attempt + 1, error, delay });
          
          // Abortable delay
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, delay);
            abortController.signal.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new DOMException('Aborted', 'AbortError'));
            }, { once: true });
          });
        }
      }
    }
    
    throw lastError;
  };
  
  return {
    promise: execute(),
    abort: () => abortController.abort(),
  };
}

// Usage:
const { promise, abort } = retryWithAbort(
  async (signal, attempt) => {
    const res = await fetch('/api/data', { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  {
    maxRetries: 3,
    shouldRetry: (err) => err.message.includes('500') || err.message.includes('503'),
    onRetry: ({ attempt, delay }) => console.log(`Retry ${attempt} in ${delay}ms`),
  }
);

// Cancel if user navigates away
window.addEventListener('beforeunload', () => abort());
```

---

## Round 2: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a LinkedIn-style Connection Request Drawer**
   - List of pending requests, accept/reject with animation, mutual connections, keyboard nav

### 💡 Interview-Ready Answer

```javascript
function ConnectionRequests({ requests, onAccept, onReject }) {
  const [localRequests, setLocalRequests] = useState(requests);
  const [removing, setRemoving] = useState(new Set());
  const listRef = useRef(null);
  const [focusIndex, setFocusIndex] = useState(0);
  
  const handleAction = useCallback(async (id, action) => {
    // Optimistic: start exit animation
    setRemoving(prev => new Set([...prev, id]));
    
    try {
      if (action === 'accept') await onAccept(id);
      else await onReject(id);
      
      // Remove after animation (300ms)
      setTimeout(() => {
        setLocalRequests(prev => prev.filter(r => r.id !== id));
        setRemoving(prev => { const next = new Set(prev); next.delete(id); return next; });
      }, 300);
    } catch (error) {
      // Revert animation on failure
      setRemoving(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  }, [onAccept, onReject]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusIndex(i => Math.min(i + 1, localRequests.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          // Accept focused request
          if (localRequests[focusIndex]) handleAction(localRequests[focusIndex].id, 'accept');
          break;
        case 'Delete':
        case 'Backspace':
          // Reject focused request
          if (localRequests[focusIndex]) handleAction(localRequests[focusIndex].id, 'reject');
          break;
      }
    };
    
    listRef.current?.addEventListener('keydown', handleKeyDown);
    return () => listRef.current?.removeEventListener('keydown', handleKeyDown);
  }, [focusIndex, localRequests, handleAction]);
  
  // Focus management
  useEffect(() => {
    const items = listRef.current?.querySelectorAll('.request-item');
    items?.[focusIndex]?.focus();
  }, [focusIndex]);
  
  return (
    <div className="connections-drawer" role="dialog" aria-label="Connection requests">
      <div className="drawer-header">
        <h2>Invitations ({localRequests.length})</h2>
      </div>
      
      <ul ref={listRef} role="list" className="request-list" tabIndex={-1}>
        {localRequests.map((req, idx) => (
          <li
            key={req.id}
            className={`request-item ${removing.has(req.id) ? 'exiting' : ''}`}
            role="listitem"
            tabIndex={idx === focusIndex ? 0 : -1}
            aria-label={`Connection request from ${req.name}`}
          >
            <img src={req.avatar} alt="" className="avatar" width="56" height="56" />
            
            <div className="request-info">
              <div className="request-name">{req.name}</div>
              <div className="request-headline">{req.headline}</div>
              
              {req.mutualConnections > 0 && (
                <div className="mutual" aria-label={`${req.mutualConnections} mutual connections`}>
                  <div className="mutual-avatars">
                    {req.mutualAvatars.slice(0, 3).map((a, i) => (
                      <img key={i} src={a} alt="" className="mini-avatar" width="20" height="20" />
                    ))}
                  </div>
                  <span>{req.mutualConnections} mutual connection{req.mutualConnections > 1 ? 's' : ''}</span>
                </div>
              )}
              
              <div className="request-time" aria-label={`Sent ${req.timeAgo}`}>
                {req.timeAgo}
              </div>
            </div>
            
            <div className="request-actions">
              <button
                className="btn-ignore"
                onClick={() => handleAction(req.id, 'reject')}
                aria-label={`Ignore ${req.name}'s request`}
              >
                Ignore
              </button>
              <button
                className="btn-accept"
                onClick={() => handleAction(req.id, 'accept')}
                aria-label={`Accept ${req.name}'s request`}
              >
                Accept
              </button>
            </div>
          </li>
        ))}
        
        {localRequests.length === 0 && (
          <li className="empty-state" role="status">
            No pending invitations
          </li>
        )}
      </ul>
      
      <style>{`
        .request-item {
          display: flex; align-items: center; padding: 16px;
          transition: opacity 0.3s, transform 0.3s, max-height 0.3s;
          max-height: 120px; overflow: hidden;
        }
        .request-item.exiting {
          opacity: 0; transform: translateX(100px); max-height: 0;
          padding: 0 16px;
        }
        .request-item:focus {
          outline: 2px solid #0a66c2; outline-offset: -2px;
          background: #f3f6f8;
        }
      `}</style>
    </div>
  );
}
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design LinkedIn Feed — Infinite Scroll with heterogeneous card types**

### 💡 Interview-Ready Answer

```
LinkedIn Feed Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Card Types (heterogeneous):                                  │
│  - Post (text, image, video, document, poll)                 │
│  - Article share                                             │
│  - Job recommendation                                        │
│  - Connection suggestion (PYMK)                              │
│  - Ad (sponsored content)                                    │
│  - Event / Learning course                                   │
│                                                                │
│  Data Fetching:                                               │
│  GET /api/feed?cursor={token}&count=10                       │
│  Response: { items: [...], nextCursor, hasMore }             │
│                                                                │
│  Infinite Scroll:                                             │
│  - IntersectionObserver on sentinel element (last item)      │
│  - Pre-fetch: trigger when 3rd-from-last item is visible     │
│  - Loading: skeleton cards (same shape as real cards)         │
│  - Deduplication: Set of seen post IDs → filter response     │
│                                                                │
│  Virtual Scrolling (NOT standard virtual list):              │
│  - Variable height cards → can't use fixed row height        │
│  - Solution: measure once, cache height per card             │
│  - ResizeObserver to handle expand/collapse of cards         │
│  - Only render cards within viewport ± 3 screens (overscan)  │
│  - Use transform: translateY for positioning (GPU)           │
│                                                                │
│  Engagement Tracking:                                         │
│  - IntersectionObserver for impression tracking              │
│    Threshold: 50% visible for ≥ 1 second = "viewed"         │
│  - Batch impressions: collect 10 → send analytics call       │
│  - Time-in-view tracking: record (post_id, dwell_time)      │
│                                                                │
│  Real-Time Updates:                                           │
│  - SSE for new posts by connections                          │
│  - "New posts available" banner (don't auto-insert)          │
│  - Like/comment count: SSE push updates                      │
│  - Optimistic like: toggle immediately, sync later           │
│                                                                │
│  Performance:                                                 │
│  - Image: srcset + loading="lazy" + LQIP                    │
│  - Video: poster image, don't play until visible + tapped    │
│  - Estimated card height for CLS prevention                  │
│  - Cache: React Query with staleTime: 5min for feed         │
│  - Memory: keep max 200 cards, unload older ones            │
│                                                                │
│  Ad Insertion:                                                │
│  - Server-side: feed API interleaves sponsored content       │
│  - Position rules: ad every 5th-8th card (not consecutive)   │
│  - Clearly labeled "Promoted" | "Sponsored"                  │
│  - Separate impression/click tracking for ads                │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- LinkedIn FE = **professional UX + accessibility + performance with variable content**
- **Promise timeout + abort** — clean pattern for network resilience
- **Optimistic UI** with exit animation → revert on failure — LinkedIn loves this pattern
- **Keyboard navigation** (roving tabindex) for list items — LinkedIn is very a11y-conscious
- **Variable-height virtual scrolling** for heterogeneous feed — harder than standard virtual list
- **Impression tracking** with IntersectionObserver + 50% + 1s threshold — standard for feeds
- LinkedIn values **thoughtful UX** over flashy animations

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Medium-Hard | Promise.race, Retry, AbortController |
| Machine Coding | Hard | Animation, Keyboard Nav, Optimistic UI |
| System Design | Very Hard | Infinite Feed, Variable Virtual Scroll |
| Behavioral | Medium | Collaboration, Leadership |
