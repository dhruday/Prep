# Apple — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Senior Frontend Engineer |
| **Level** | ICT4 |
| **YOE** | 6 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/Interview/Apple-Interview-Questions-E1138.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)
- **Timeline:** 5 weeks (Apple is slow)
- **Format:** Virtual
- **Note:** Apple tests accessibility, performance, and attention to detail heavily

---

## Round 1: Phone Screen — HTML/CSS/JS Fundamentals
**Duration:** 45 minutes

### Questions Asked
1. **Build a responsive image gallery with CSS Grid**
2. **Explain CSS specificity calculation**

### 💡 Interview-Ready Answer — CSS Specificity

```
CSS Specificity Rules (from highest to lowest):

1. Inline styles:           1,0,0,0
   <div style="color: red">

2. ID selectors:            0,1,0,0
   #header { }

3. Class/attribute/pseudo:  0,0,1,0
   .nav { }
   [type="text"] { }
   :hover { }

4. Element/pseudo-element:  0,0,0,1
   div { }
   ::before { }

Calculation: Count each type, compare left to right.

Example:
  div.container#main p.text  →  0,1,2,2
  ├── #main       = 0,1,0,0
  ├── .container   = 0,0,1,0
  ├── .text        = 0,0,1,0
  ├── div          = 0,0,0,1
  └── p            = 0,0,0,1

  body div#main .content p  →  0,1,1,3
  
  First one wins: 0,1,2,2 > 0,1,1,3 (compare 3rd position: 2 > 1)

!important overrides everything (avoid it).
```

### 💡 Interview-Ready Answer — Responsive Image Gallery

```html
<div class="gallery" role="list">
  <figure class="gallery-item" role="listitem">
    <img src="photo1.webp" alt="Mountain landscape at sunset" loading="lazy" />
    <figcaption>Mountain Sunset</figcaption>
  </figure>
  <!-- ... more items -->
</div>

<style>
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  padding: 16px;
}

.gallery-item {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  aspect-ratio: 4/3;
  margin: 0;
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.gallery-item:hover img {
  transform: scale(1.05);
}

.gallery-item figcaption {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 8px;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  color: white;
  font-size: 0.875rem;
}

/* Accessibility: focus-visible for keyboard navigation */
.gallery-item:focus-visible {
  outline: 3px solid #0071e3; /* Apple blue */
  outline-offset: 2px;
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .gallery-item img { transition: none; }
}
</style>
```

---

## Round 2: JavaScript Coding
**Duration:** 45 minutes

### Questions Asked
1. **Implement a deep comparison function (isEqual)**
2. **Build a PubSub with wildcard subscriptions**

### 💡 Interview-Ready Answer — Deep Equal

```javascript
function isEqual(a, b) {
  // Same reference or primitive equality
  if (a === b) return true;
  
  // null/undefined check
  if (a == null || b == null) return a === b;
  
  // Type check
  if (typeof a !== typeof b) return false;
  
  // Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  
  // RegExp comparison
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }
  
  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => isEqual(item, b[i]));
  }
  
  // Non-objects
  if (typeof a !== 'object') return false;
  
  // Object comparison
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => 
    Object.prototype.hasOwnProperty.call(b, key) && isEqual(a[key], b[key])
  );
}

// Edge case: circular references
function isEqualWithCircular(a, b, seen = new WeakMap()) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  
  // Circular reference detection
  if (seen.has(a)) return seen.get(a) === b;
  seen.set(a, b);
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key =>
    Object.prototype.hasOwnProperty.call(b, key) && isEqualWithCircular(a[key], b[key], seen)
  );
}
```

### 💡 Interview-Ready Answer — PubSub with Wildcards

```javascript
class PubSub {
  constructor() {
    this.subscribers = new Map(); // exact topic → Set<callback>
    this.wildcardSubs = [];       // {pattern: RegExp, callback}
  }
  
  subscribe(topic, callback) {
    if (topic.includes('*')) {
      // Convert wildcard pattern to regex
      // "user.*" matches "user.created", "user.updated", etc.
      // "*.error" matches "payment.error", "auth.error"
      // "**" matches everything
      const regexStr = topic
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^.]+');
      
      const entry = { pattern: new RegExp(`^${regexStr}$`), callback };
      this.wildcardSubs.push(entry);
      
      return () => {
        const idx = this.wildcardSubs.indexOf(entry);
        if (idx !== -1) this.wildcardSubs.splice(idx, 1);
      };
    }
    
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic).add(callback);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(topic);
      if (subs) subs.delete(callback);
    };
  }
  
  publish(topic, data) {
    // Exact match subscribers
    const exactSubs = this.subscribers.get(topic);
    if (exactSubs) {
      for (const cb of exactSubs) {
        try { cb(data, topic); } catch (e) { console.error('Subscriber error:', e); }
      }
    }
    
    // Wildcard subscribers
    for (const { pattern, callback } of this.wildcardSubs) {
      if (pattern.test(topic)) {
        try { callback(data, topic); } catch (e) { console.error('Subscriber error:', e); }
      }
    }
  }
}

// Usage:
const bus = new PubSub();
bus.subscribe('user.*', (data, topic) => console.log(`User event: ${topic}`, data));
bus.subscribe('**.error', (data, topic) => console.log(`Error: ${topic}`, data));
bus.publish('user.created', { id: 1, name: 'Alice' }); // triggers "user.*"
bus.publish('payment.error', { msg: 'declined' });       // triggers "**.error"
```

---

## Round 3: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Apple Music Web Player**
   - Audio playback, queue management, search, offline mode, cross-device sync

### 💡 Interview-Ready Answer

```
Apple Music Web Player Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Audio Engine (Core)                                          │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Web Audio API + HTMLAudioElement                      │    │
│  │                                                        │    │
│  │  MediaSource Extensions (MSE) for adaptive streaming  │    │
│  │  ├── HLS (HTTP Live Streaming) — Apple's format       │    │
│  │  ├── Adaptive bitrate: 64kbps → 256kbps              │    │
│  │  └── Buffer management (prefetch next track)          │    │
│  │                                                        │    │
│  │  Audio Context                                         │    │
│  │  ├── GainNode (volume control)                        │    │
│  │  ├── AnalyserNode (visualizations)                    │    │
│  │  └── DynamicsCompressor (normalize loudness)          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  Queue Manager                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  currentTrack: Track                                   │    │
│  │  queue: Track[]        // upcoming                    │    │
│  │  history: Track[]      // played                      │    │
│  │                                                        │    │
│  │  Operations:                                           │    │
│  │  - play(track): push current to history, set new      │    │
│  │  - next(): pop from queue, push current to history    │    │
│  │  - previous(): pop from history, push current to queue│    │
│  │  - shuffle(): Fisher-Yates on queue                   │    │
│  │  - repeat: NONE | ONE | ALL                           │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  Media Session API (OS integration)                           │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  navigator.mediaSession.metadata = new MediaMetadata({│    │
│  │    title: "Bohemian Rhapsody",                        │    │
│  │    artist: "Queen",                                    │    │
│  │    album: "A Night at the Opera",                     │    │
│  │    artwork: [{ src: "cover.jpg", sizes: "512x512" }]  │    │
│  │  });                                                   │    │
│  │  // Shows in MacOS Now Playing, Lock Screen, etc.     │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

#### Offline Mode with Service Worker
```javascript
// service-worker.js
const CACHE_NAME = 'apple-music-v1';
const OFFLINE_TRACKS = 'offline-tracks';

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Strategy 1: Audio files → Cache First (if downloaded for offline)
  if (url.pathname.startsWith('/audio/')) {
    event.respondWith(
      caches.open(OFFLINE_TRACKS).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request); // Not cached → stream from network
        })
      )
    );
    return;
  }
  
  // Strategy 2: App shell → Stale While Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        const network = fetch(event.request).then(response => {
          cache.put(event.request, response.clone());
          return response;
        });
        return cached || network;
      })
    )
  );
});

// Download track for offline listening
async function downloadForOffline(trackId, audioUrl) {
  const cache = await caches.open(OFFLINE_TRACKS);
  const response = await fetch(audioUrl);
  
  // Store audio in cache
  await cache.put(audioUrl, response.clone());
  
  // Store metadata in IndexedDB
  const db = await openDB('music-db');
  const tx = db.transaction('offline-tracks', 'readwrite');
  await tx.store.put({ trackId, audioUrl, downloadedAt: Date.now() });
  
  // Check storage quota
  const estimate = await navigator.storage.estimate();
  const usedGB = estimate.usage / (1024 ** 3);
  if (usedGB > 2) {
    // Evict oldest offline tracks
    await evictOldTracks(db);
  }
}
```

---

## Round 4: Behavioral (Apple-specific)
**Duration:** 45 minutes

### Questions Asked
1. **"Tell me about attention to detail in your work"** (Apple cares deeply about craft)
2. **"How do you approach accessibility?"**

### 💡 Interview-Ready Answer — Accessibility Approach

> "I follow a layered approach:
> 1. **Semantic HTML first:** Use `<button>`, `<nav>`, `<main>`, not `<div onClick>`. Screen readers understand native elements.
> 2. **ARIA where native semantics fall short:** `aria-label`, `aria-live` for dynamic content, `role` for custom widgets.
> 3. **Keyboard navigation:** Every interactive element reachable via Tab. Custom components implement arrow key navigation per WAI-ARIA patterns.
> 4. **Focus management:** After route change or modal open, move focus programmatically. Use focus traps in modals.
> 5. **Color contrast:** WCAG AA minimum (4.5:1 for text, 3:1 for large text). I use `prefers-color-scheme` and `prefers-contrast`.
> 6. **Testing:** Automated (axe-core in CI), manual (VoiceOver on Mac, NVDA on Windows), and real user testing."

---

## 🎯 Key Takeaways
- Apple FE interviews test **CSS deeply** — specificity, Grid, responsive design, animations
- **Deep equal** with circular reference handling is a classic JavaScript question
- **PubSub with wildcards** tests string/regex + OOP — common at Apple
- **Apple Music design** = audio streaming + offline + OS integration
- **Web Audio API** and **Media Session API** knowledge differentiates strong candidates
- **Service Worker** for offline audio caching — know cache strategies
- Apple values **attention to detail** and **accessibility** above all — mention `prefers-reduced-motion`, `prefers-color-scheme`, semantic HTML in every answer

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | CSS, Specificity, Grid |
| Coding | Medium-Hard | Deep Equal, PubSub, Regex |
| FE Design | Hard | Audio Streaming, Offline, Service Worker |
| Behavioral | Medium | Craft, a11y, Attention to Detail |
