# Topic 14: Browser Process Architecture — Multi-Process Model

---

## 1. High-Level Explanation

Modern browsers (Chrome, Edge, Firefox) use a **multi-process architecture** to isolate web content for security and stability. Chrome pioneered this with its process-per-site-instance model. Instead of one process doing everything, the browser delegates rendering, network, GPU compositing, and plugin execution to separate OS-level processes.

This means one crashing tab does not crash the browser, and a malicious site cannot read memory from another tab.

---

## 2. Deep-Dive

### Chrome's Process Architecture (most widely studied)

| Process | Count | Responsibility |
|---|---|---|
| **Browser Process** | 1 | UI chrome (address bar, tabs), coordinates other processes, network stack (in older versions) |
| **Renderer Process** | 1 per site-instance | Runs Blink (HTML/CSS parsing, JS) and V8. Sandboxed — no direct system access |
| **GPU Process** | 1 | Handles GPU commands from all renderers, composites layers onto the screen |
| **Network Service Process** | 1 | All network I/O (DNS, TCP, HTTP/3/QUIC, caching) — isolated post-Chrome 80 |
| **Utility Processes** | n | Audio, storage, individual extensions |

### The Renderer Process — The Star of the Show

Every renderer process runs the full **pipeline**:
```
HTML bytes → Parse → DOM → CSSOM → Render Tree → Layout → Paint → Compositor
```

The renderer is **sandboxed** — it communicates with the browser process via IPC (inter-process communication) for anything that requires OS access (file I/O, camera, network). This is the core of Chrome's security model.

### Site Isolation (Post-Spectre)

After the Spectre CPU vulnerability was disclosed in 2018, Chrome enabled **Site Isolation** by default. Each cross-origin iframe gets its own renderer process. This prevents `window.performance.memory` or SharedArrayBuffer timing attacks across origins.

```
Tab: https://yourbank.com
  ├── iframe: https://yourbank.com/dashboard → same renderer ✅
  └── iframe: https://ads.doubleclick.net    → separate renderer 🔒
```

### Inter-Process Communication (IPC) via Mojo

Chrome uses a custom IPC system called **Mojo**. When a renderer needs to:
- Fetch a URL → IPC to Network Service
- Write to localStorage → IPC to Storage Service
- Render a frame → Compositor commands via IPC to GPU Process

This IPC overhead is a real cost — but it's dwarfed by the security and stability benefit.

### Memory Implications

With site isolation, a page with 10 cross-origin iframes can spawn 11 renderer processes. Each Chrome renderer process has a baseline memory cost of ~50–100MB. This is the explicit memory trade-off Chrome made for security — and why Chrome has a reputation for RAM usage.

---

## 3. Real-World Examples

### Hruday's SAP Application Context

At SAP Labs, the enterprise portal embeds multiple micro-frontends from different domains via iframes. With Site Isolation, each micro-frontend iframe gets its own renderer process:
- Isolated memory → crash in one MFE doesn't affect others ✅
- IPC overhead → cross-frame communication must go through `postMessage` (not direct DOM access)
- Memory budget: 10 iframes × 70MB = 700MB → we added lazy-loading for off-screen iframes

### Debugging Process Architecture in Chrome DevTools

Open `chrome://process-internals` or the Task Manager (`Shift+Esc`) to see all renderer, GPU, and network service processes. Useful for diagnosing memory bloat in MFE architectures.

---

## 4. Interview-Oriented Answer

**Q: "Why does Chrome use a multi-process architecture?"**

**Answer (STAR structure):**
> Chrome uses a multi-process architecture for three reasons: **security** (sandboxed renderers can't access OS directly), **stability** (a crashing renderer doesn't crash the browser), and **performance** (GPU compositing happens in a dedicated process without blocking rendering).
>
> The key trade-off is **memory** — each renderer process costs ~50–100MB baseline. Chrome explicitly accepted this trade-off (and made the compat/tab count problem visible to users) to gain security guarantees impossible in a single-process model.
>
> At SAP, our micro-frontend architecture creates multiple renderer processes for cross-origin iframes. We mitigate the memory cost with intersection-observer-based iframe lazy-loading.

**Follow-up: "What changed after Spectre?"**
> Site Isolation was enabled by default. Every cross-origin iframe now runs in its own renderer process, preventing cross-origin memory timing attacks. This doubled the process count for sites with third-party iframes, but was necessary for hardware-level security guarantees.

---

## 5. Code Example

```typescript
// Detecting cross-origin isolation status (post-Spectre)
// Useful to know which features (SharedArrayBuffer, COEP) are available

// Headers required for cross-origin isolation:
// Cross-Origin-Embedder-Policy: require-corp
// Cross-Origin-Opener-Policy: same-origin

const isCrossOriginIsolated = window.crossOriginIsolated;
console.log('Cross-Origin Isolated:', isCrossOriginIsolated);
// true → SharedArrayBuffer available, high-resolution timers unlocked

// postMessage between cross-origin iframes (required due to Site Isolation)
// Parent → iframe
const iframe = document.querySelector('iframe') as HTMLIFrameElement;
iframe.contentWindow?.postMessage(
  { type: 'THEME_CHANGE', theme: 'dark' },
  'https://trusted-mfe.sap.com'  // always specify origin, never '*' in production!
);

// iframe → parent (inside iframe code)
window.parent.postMessage(
  { type: 'MFE_READY', app: 'fiori-analytics' },
  'https://portal.sap.com'
);
```

```typescript
// Performance Observer: measuring IPC/rendering process cost
// Use PerformanceLongTaskObserver to detect renderer main thread jank
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.duration > 50) {
      console.warn(`Long Task: ${entry.duration}ms — likely caused by renderer main thread blocking`);
      // If tasks cluster around iframe messages, IPC serialization overhead is the culprit
    }
  });
});
observer.observe({ entryTypes: ['longtask'] });
```

---

## 6. Memory Aid

**"BRGNU" — Browser, Renderer, GPU, Network, Utility**

- **B**rowser Process = the manager (1 instance, coordinates all)
- **R**enderer Process = the worker bee (1 per site-instance, sandboxed)
- **G**PU Process = the painter (1 instance, composites all frames)
- **N**etwork Service = the mailman (1 instance, all I/O)
- **U**tility = the specialists (audio, storage, extensions)

**Security rule**: Renderer is always sandboxed → IPC for everything requiring OS access.
**Spectre rule**: Cross-origin → separate renderer process (Site Isolation).

---

## 7. Why & How Summary

**Why multi-process?**
- Security: sandboxed renderer cannot read OS memory directly
- Stability: tab crash is isolated — doesn't kill the browser
- Performance: GPU compositing runs without blocking rendering

**How it works:**
1. Browser Process spawns one Renderer Process per site-instance
2. Renderer runs Blink + V8, produces compositor commands
3. Compositor commands sent via IPC to GPU Process → drawn to screen
4. Network requests go via IPC to Network Service Process
5. Site Isolation ensures cross-origin iframes are in separate renderer processes

**The trade-off:** +50–100MB RAM per renderer process. Chrome accepts this for security; mobile Chrome uses a more aggressive process reuse policy due to memory constraints.
