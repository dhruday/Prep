# 15. Web Workers, Service Workers, Worklets

## 1. High-Level Explanation (Frontend Interview Level)

**Web Workers, Service Workers, Worklets** are three distinct worker types enabling parallel execution, offline capabilities, and rendering customization—each with different lifecycles, APIs, and use cases.

- **Web Workers**: Parallel JavaScript execution (CPU-intensive tasks)
- **Service Workers**: Network proxy for offline-first PWAs (caching, background sync)
- **Worklets**: Lightweight workers for rendering customization (CSS Paint API, Animation Worklet)

**Key Principle**: "Different worker types for different problems—computation, networking, rendering."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### 1. Web Workers (Dedicated & Shared)

**Dedicated Web Workers** (Most Common):
```
Main Thread                 Dedicated Worker
├── UI/DOM                  ├── JavaScript only
├── JavaScript              ├── No DOM
├── postMessage() ─────────→ self.onmessage
└── onmessage ←───────────── self.postMessage()

Lifecycle:
1. new Worker('worker.js')  - Create
2. postMessage()            - Send data
3. onmessage                - Receive result
4. terminate()              - Destroy
```

**API**:
```javascript
// Main Thread
const worker = new Worker('/workers/compute.js');

// Send task
worker.postMessage({ 
  type: 'calculate', 
  data: [1, 2, 3, ...] 
});

// Receive result
worker.onmessage = (event) => {
  const { result } = event.data;
  console.log('Result:', result);
};

// Handle errors
worker.onerror = (error) => {
  console.error('Worker error:', error.message);
};

// Clean up
worker.terminate();
```

```javascript
// worker.js (Worker Thread)
// Global: self (not window)
self.onmessage = (event) => {
  const { type, data } = event.data;
  
  if (type === 'calculate') {
    const result = heavyComputation(data);
    self.postMessage({ result });
  }
};

// Import external libraries
importScripts(
  '/libs/lodash.min.js',
  '/libs/math.js'
);

// Available APIs
fetch('/api/data');           // ✅ Network
setTimeout(() => {}, 1000);   // ✅ Timers
console.log('Worker log');    // ✅ Console
navigator.userAgent;          // ✅ Navigator (partial)

// NOT available
document.body;                // ❌ No DOM
window.alert();               // ❌ No window
localStorage.getItem();       // ❌ No storage
```

---

**Shared Web Workers** (Shared Across Tabs):
```
Tab 1                      Shared Worker               Tab 2
├── new SharedWorker() ────→ ├── Single instance ←──── new SharedWorker()
├── port.postMessage() ────→ │   (shared)         ←──── port.postMessage()
└── port.onmessage ←────────┤                     ────→ port.onmessage
                             └── Shared state
```

**Use Case**: Real-time sync across tabs:
```javascript
// Tab 1 & Tab 2 (both connect to same worker)
const worker = new SharedWorker('/workers/sync.js');

// Each tab gets a MessagePort
worker.port.start();

worker.port.postMessage({ type: 'subscribe' });

worker.port.onmessage = (event) => {
  console.log('Update from other tab:', event.data);
};

// sync.js (Shared Worker)
const connections = [];

self.onconnect = (event) => {
  const port = event.ports[0];
  connections.push(port);
  
  port.onmessage = (e) => {
    // Broadcast to all tabs
    connections.forEach(conn => {
      if (conn !== port) {
        conn.postMessage(e.data);
      }
    });
  };
};
```

**When to Use Shared Workers**:
- Cross-tab communication (chat, notifications)
- Shared WebSocket connection (one connection for all tabs)
- Rarely used (complex, limited browser support)

---

### 2. Service Workers (Network Proxy)

**Service Worker Lifecycle**:
```
1. Register
   navigator.serviceWorker.register('/sw.js')

2. Install (first time)
   self.addEventListener('install', event => {
     // Precache resources
   })

3. Activate (after install)
   self.addEventListener('activate', event => {
     // Clean old caches
   })

4. Fetch (intercept network requests)
   self.addEventListener('fetch', event => {
     // Return cached response or fetch from network
   })

5. Update (new version)
   New sw.js detected → Install → Wait → Activate
```

**Service Worker Scope**:
```
Website:
├── /                       (Service Worker scope: root)
│   ├── index.html          ✅ Controlled
│   ├── about.html          ✅ Controlled
│   └── /shop/              ✅ Controlled
│       └── product.html    ✅ Controlled
└── sw.js

Scope Rule: Service Worker controls all pages at its path and below
```

**Registration**:
```javascript
// main.js (Main Thread)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('SW registered:', registration.scope);
      
      // Check for updates
      registration.update();
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            console.log('New version ready!');
          }
        });
      });
    })
    .catch(err => console.error('SW registration failed:', err));
}
```

---

**Caching Strategies**:

**1. Cache-First** (offline-first, static assets):
```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Fallback to network
        return fetch(event.request);
      })
  );
});

// Use for: CSS, JS, images, fonts (rarely change)
```

**2. Network-First** (fresh data, fallback to cache):
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Network success: cache and return
        const responseClone = response.clone();
        caches.open('dynamic').then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Network failed: return cached version
        return caches.match(event.request);
      })
  );
});

// Use for: API calls, news articles (want fresh, tolerate stale)
```

**3. Stale-While-Revalidate** (instant response + background update):
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached immediately
        const fetchPromise = fetch(event.request).then(response => {
          // Update cache in background
          const responseClone = response.clone();
          caches.open('dynamic').then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
        
        // Return cached or fresh (whichever comes first)
        return cachedResponse || fetchPromise;
      })
  );
});

// Use for: Social media feeds, product listings (show stale, update in background)
```

**4. Network-Only** (always fresh, no cache):
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// Use for: Payment APIs, user-specific data (no caching)
```

---

**Precaching Static Assets**:
```javascript
// sw.js
const CACHE_NAME = 'v1';
const urlsToCache = [
  '/',
  '/styles/main.css',
  '/scripts/app.js',
  '/images/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  
  // Skip waiting (activate immediately)
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control immediately
  self.clients.claim();
});
```

---

**Background Sync** (retry failed requests):
```javascript
// Main Thread
navigator.serviceWorker.ready.then(registration => {
  // Request background sync
  registration.sync.register('send-message');
});

// sw.js
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-message') {
    event.waitUntil(
      // Retry sending message
      fetch('/api/send', { method: 'POST', body: pendingMessages })
        .then(() => console.log('Message sent in background'))
    );
  }
});

// Use case: User submits form offline → queued → sent when online
```

---

**Push Notifications**:
```javascript
// Main Thread: Subscribe to push
navigator.serviceWorker.ready.then(registration => {
  registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: publicKey
  }).then(subscription => {
    // Send subscription to server
    fetch('/api/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription)
    });
  });
});

// sw.js: Receive push notification
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.png',
      badge: '/badge.png',
      data: { url: data.url }
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

---

### 3. Worklets (Lightweight Workers)

**Types of Worklets**:
```
1. CSS Paint API (Paint Worklet)
   └── Custom paint() function for CSS backgrounds

2. Animation Worklet
   └── High-performance off-main-thread animations

3. Audio Worklet
   └── Low-latency audio processing

4. Layout Worklet (experimental)
   └── Custom layout algorithms
```

---

**CSS Paint API** (Custom Backgrounds):

**Register Worklet**:
```javascript
// Main Thread
CSS.paintWorklet.addModule('paint-worklet.js');
```

```javascript
// paint-worklet.js
class CheckerboardPainter {
  static get inputProperties() {
    return ['--checkerboard-size', '--checkerboard-color'];
  }
  
  paint(ctx, geom, properties) {
    const size = parseInt(properties.get('--checkerboard-size'));
    const color = properties.get('--checkerboard-color');
    
    // Draw checkerboard pattern
    for (let x = 0; x < geom.width; x += size * 2) {
      for (let y = 0; y < geom.height; y += size * 2) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
        ctx.fillRect(x + size, y + size, size, size);
      }
    }
  }
}

registerPaint('checkerboard', CheckerboardPainter);
```

**Use in CSS**:
```css
.box {
  --checkerboard-size: 20;
  --checkerboard-color: #333;
  background: paint(checkerboard);
  width: 400px;
  height: 400px;
}
```

**Benefits**:
- Dynamic backgrounds (no image files)
- Responsive (repaints on size change)
- Small file size

---

**Animation Worklet** (Off-Main-Thread Animations):

**Register Worklet**:
```javascript
// Main Thread
await CSS.animationWorklet.addModule('animation-worklet.js');

const effect = new WorkletAnimation(
  'parallax',
  new KeyframeEffect(element, keyframes, options),
  document.timeline,
  { scrollSource: scroller }
);
effect.play();
```

```javascript
// animation-worklet.js
registerAnimator('parallax', class {
  animate(currentTime, effect) {
    const scroll = currentTime.scrollY;
    effect.localTime = scroll * 0.5; // Parallax effect
  }
});
```

**Benefits**:
- 60fps scrolling (independent of Main Thread)
- Complex scroll-linked animations (parallax, sticky headers)

---

**Audio Worklet** (Custom Audio Processing):

**Register Worklet**:
```javascript
// Main Thread
const audioContext = new AudioContext();
await audioContext.audioWorklet.addModule('audio-processor.js');

const oscillator = new OscillatorNode(audioContext);
const customNode = new AudioWorkletNode(audioContext, 'custom-processor');

oscillator.connect(customNode).connect(audioContext.destination);
oscillator.start();
```

```javascript
// audio-processor.js
class CustomProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    // Process audio samples
    for (let channel = 0; channel < output.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      
      for (let i = 0; i < outputChannel.length; i++) {
        outputChannel[i] = inputChannel[i] * 0.5; // Reduce volume
      }
    }
    
    return true; // Keep processing
  }
}

registerProcessor('custom-processor', CustomProcessor);
```

**Benefits**:
- Low-latency audio (< 10ms)
- Custom effects (reverb, distortion, pitch shift)

---

### Comparison Table

| Feature | Web Worker | Service Worker | Worklet |
|---------|-----------|---------------|---------|
| **Purpose** | Parallel computation | Network proxy, offline | Rendering customization |
| **Lifecycle** | Created/destroyed per task | Persistent (survives page close) | Lightweight, ephemeral |
| **Scope** | Page-specific | Site-wide (all pages) | Specific API (paint, audio) |
| **DOM Access** | ❌ No | ❌ No | ❌ No |
| **Network** | ✅ fetch() | ✅ fetch() intercept | ❌ Limited |
| **Storage** | ❌ No localStorage | ✅ Cache API, IndexedDB | ❌ No |
| **Use Case** | Image processing, data parsing | PWA, offline caching | Custom backgrounds, animations |

---

## 3. Clear Real-World Examples

### Example 1: Twitter PWA – Service Worker Caching

**Challenge**: Load tweets instantly, even offline.

**Solution**: Service Worker with stale-while-revalidate:
```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/tweets')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          caches.open('tweets').then(cache => {
            cache.put(event.request, response.clone());
          });
          return response;
        });
        
        // Return cached immediately, update in background
        return cached || fetchPromise;
      })
    );
  }
});
```

**Result**: Instant tweet loading (from cache), fresh tweets loaded in background.

---

### Example 2: Figma – Web Worker for Rendering

**Challenge**: Complex vector graphics rendering without UI jank.

**Solution**: OffscreenCanvas in Web Worker:
```javascript
// Main Thread
const canvas = document.getElementById('canvas');
const offscreen = canvas.transferControlToOffscreen();

const worker = new Worker('render-worker.js');
worker.postMessage({ canvas: offscreen }, [offscreen]);

// render-worker.js
let ctx;

self.onmessage = (e) => {
  if (e.data.canvas) {
    ctx = e.data.canvas.getContext('2d');
    render();
  }
};

function render() {
  // Complex rendering (doesn't block Main Thread)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawVectorShapes(ctx);
  
  requestAnimationFrame(render);
}
```

**Result**: 60fps rendering, Main Thread handles user input.

---

### Example 3: Houdini CSS Paint API – Animated Background

**Challenge**: Dynamic, animated backgrounds without images.

**Solution**: Paint Worklet with time-based animation:
```javascript
// paint-worklet.js
class AnimatedGradient {
  paint(ctx, geom, properties) {
    const time = Date.now() / 1000;
    const gradient = ctx.createLinearGradient(0, 0, geom.width, geom.height);
    
    gradient.addColorStop(0, `hsl(${time * 50 % 360}, 70%, 50%)`);
    gradient.addColorStop(1, `hsl(${(time * 50 + 180) % 360}, 70%, 50%)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, geom.width, geom.height);
  }
}

registerPaint('animated-gradient', AnimatedGradient);
```

```css
.hero {
  background: paint(animated-gradient);
  animation: repaint 60s linear infinite;
}

@keyframes repaint {
  to { --repaint-trigger: 1; }
}
```

**Result**: Animated gradient background (no images, small file size).

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "Explain Web Workers, Service Workers, and Worklets."

**Answer**:

"Three **distinct worker types** with different purposes:

---

### 1. Web Workers (Parallel Computation)

**Purpose**: Parallel JavaScript execution for CPU-intensive tasks.

**Types**:
- **Dedicated Workers**: One-to-one with page (most common)
- **Shared Workers**: Shared across tabs (rare)

**API**:
```javascript
// Main Thread
const worker = new Worker('worker.js');
worker.postMessage({ data: largeArray });

worker.onmessage = (e) => {
  console.log('Result:', e.data);
};

// worker.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};
```

**Available in Worker**:
- ✅ `fetch()`, `setTimeout()`, `console.log()`
- ✅ `importScripts()` for libraries
- ❌ No DOM (`document`, `window`)
- ❌ No storage (`localStorage`)

**Use Cases**:
- Image processing (filters, resizing)
- Data parsing (large JSON/CSV)
- Cryptography (hashing, encryption)

**Example**: Figma uses OffscreenCanvas in Workers for rendering (60fps).

---

### 2. Service Workers (Network Proxy)

**Purpose**: Intercept network requests for offline-first PWAs.

**Lifecycle**:
```
1. Register:  navigator.serviceWorker.register('/sw.js')
2. Install:   Cache static assets
3. Activate:  Clean old caches
4. Fetch:     Intercept requests, return cached/network
```

**Caching Strategies**:

**Cache-First** (static assets):
```javascript
caches.match(request) || fetch(request)
```

**Network-First** (API calls):
```javascript
fetch(request).catch(() => caches.match(request))
```

**Stale-While-Revalidate** (instant + background update):
```javascript
return cached || fetch(request)
// Update cache in background
```

**Features**:
- **Background Sync**: Retry failed requests when online
- **Push Notifications**: Re-engage users
- **Offline Mode**: App shell cached (works offline)

**Example**: Twitter PWA caches tweets (instant load, works offline).

**Scope**: Controls all pages at its path and below.

---

### 3. Worklets (Rendering Customization)

**Purpose**: Lightweight workers for **specific rendering tasks**.

**Types**:

**a) CSS Paint API** (Paint Worklet):
```javascript
// paint-worklet.js
class Checkerboard {
  paint(ctx, geom, properties) {
    // Draw custom background
  }
}
registerPaint('checkerboard', Checkerboard);
```

```css
.box {
  background: paint(checkerboard);
}
```

**Use**: Dynamic backgrounds (no images).

**b) Animation Worklet**:
```javascript
registerAnimator('parallax', class {
  animate(currentTime, effect) {
    effect.localTime = currentTime.scrollY * 0.5;
  }
});
```

**Use**: Off-main-thread scroll animations (60fps parallax).

**c) Audio Worklet**:
```javascript
class CustomProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    // Audio processing
  }
}
```

**Use**: Low-latency audio effects (<10ms).

---

### Comparison

| Feature | Web Worker | Service Worker | Worklet |
|---------|-----------|---------------|---------|
| **Purpose** | Parallel JS | Network proxy | Rendering |
| **Lifecycle** | Per-task | Persistent | Ephemeral |
| **Scope** | Page | Site-wide | API-specific |
| **DOM** | ❌ | ❌ | ❌ |
| **Network** | ✅ | ✅ Intercept | ❌ |
| **Storage** | ❌ | ✅ Cache API | ❌ |

---

**Real-World**:

**Web Worker**: Figma (rendering), Google Sheets (calculations)  
**Service Worker**: Twitter (offline PWA), Gmail (background sync)  
**Worklet**: Houdini (custom CSS), Audio effects (reverb)

---

**Trade-offs**:

**Web Workers**:
- ✅ Parallel execution (doesn't block UI)
- ❌ postMessage overhead (serialize/deserialize)
- ❌ No DOM access (need workaround)

**Service Workers**:
- ✅ Offline-first (works without network)
- ✅ Persistent (survives page close)
- ❌ Complex lifecycle (install → activate → fetch)
- ❌ HTTPS only (security requirement)

**Worklets**:
- ✅ Lightweight (low overhead)
- ✅ API-specific (optimized for task)
- ❌ Limited browser support (experimental)
- ❌ Narrow use cases

**Follow-up I Expect**:

Q: 'How do Service Workers update?'
A: New sw.js detected → Install event → Wait (old SW still active) → Activate on next page load. Use `skipWaiting()` + `clients.claim()` for immediate activation.

Q: 'Service Worker caching vs HTTP caching?'
A: HTTP caching: Browser-controlled (Cache-Control headers). Service Worker: **Programmatic control** (custom strategies, offline fallback, dynamic responses). SW overrides HTTP cache.

Q: 'What's the overhead of Workers?'
A: Web Worker: ~5-10ms startup, ~1-2MB memory. Service Worker: ~10-20ms initial activation, persistent (no per-request cost). Worklet: <1ms (lightweight)."

---

## 6. Why & How Summary

### Why It Matters

**Web Workers**: Parallel JS execution (heavy computation doesn't block UI)  
**Service Workers**: Offline-first PWAs (works without network, fast repeat visits)  
**Worklets**: Rendering customization (dynamic backgrounds, smooth animations, audio effects)  
**Different Tools**: Each optimized for specific problem (computation, networking, rendering)

### How It Works

**Web Workers**: Separate thread, postMessage communication, no DOM access, use for CPU-intensive tasks  
**Service Workers**: Network proxy, intercepts fetch requests, caching strategies (cache-first, network-first, stale-while-revalidate), background sync + push notifications, persistent lifecycle (install → activate → fetch)  
**Worklets**: Lightweight API-specific workers (Paint: custom backgrounds, Animation: off-main-thread scroll, Audio: low-latency processing), registered with addModule(), limited scope  
**Comparison**: Web Worker (per-page, computation), Service Worker (site-wide, persistent, offline), Worklet (ephemeral, rendering)

**FAANG Expectation**: Explain three worker types with distinct purposes, Web Worker API (postMessage, onmessage, importScripts), Service Worker lifecycle (register → install → activate → fetch), caching strategies (cache-first, network-first, stale-while-revalidate) with use cases, background sync + push notifications, Worklet types (Paint API, Animation Worklet, Audio Worklet) with code examples, comparison table (purpose, lifecycle, scope, capabilities), real-world examples (Figma, Twitter, Houdini), trade-offs (postMessage overhead, SW complexity, Worklet browser support)
