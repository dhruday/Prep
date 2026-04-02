# 42. Worklets — Audio, Paint, Layout Worklets
**Phase:** Foundations | **Sequence:** SEQ 2 — Browser & Web Platform Internals | **Company:** Adobe, Microsoft

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds. Crisp. Confident. Numbers included where relevant.

Worklets are a family of lightweight worker-like contexts that plug directly into specific parts of the browser's rendering and audio pipeline. Unlike Web Workers which are general-purpose background threads, each Worklet type has a precise role: Paint Worklets extend the browser's CSS painting step, Layout Worklets extend the CSS layout algorithm, and Audio Worklets run on the audio rendering thread for real-time sound processing. The key distinction is that Worklets run inside the browser's internal processing threads — not on the main JavaScript thread — which means they can execute at the exact timing required by the rendering or audio pipeline. At Adobe, Paint Worklets are directly relevant for building complex generative patterns and visual effects in CSS without Canvas overhead. For most senior frontend engineering contexts, Paint Worklet is the most interview-relevant type; Audio Worklet is critical for audio/media companies.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Worklets extend the rendering and audio pipeline with custom JavaScript code. They exist because:
- **Web Workers** are general-purpose but disconnected from rendering — you can't plug a Web Worker directly into the CSS paint step
- **Main thread** is already overloaded — adding custom rendering logic there creates jank
- **Native CSS/rendering engine** is opaque — CSS custom properties can change visual output but can't express arbitrary algorithmic painting

**The Worklet types (CSS Houdini + Web Audio):**

| Worklet Type | API | Runs On | Purpose |
|---|---|---|---|
| **Paint Worklet** | CSS Houdini — `CSS.paintWorklet` | Compositor/paint thread | Custom CSS backgrounds, borders, images |
| **Layout Worklet** | CSS Houdini — `CSS.layoutWorklet` | Layout thread | Custom CSS layout algorithms |
| **Animation Worklet** | CSS Houdini — `CSS.animationWorklet` | Compositor thread | Timeline-linked animations, no jank |
| **Audio Worklet** | Web Audio API — `AudioContext.audioWorklet` | Audio rendering thread | Real-time audio processing |
| **Shared Storage Worklet** | Privacy Sandbox | Isolated | Aggregate measurement without user tracking |

### How It Works Internally

#### Paint Worklet (CSS Houdini)

```
Normal CSS:
  Browser rendering engine computes style
  → Runs layout
  → Paints pixels using built-in CSS algorithms

Paint Worklet:
  Browser rendering engine computes style
  → Runs layout
  → Encounters `background-image: paint(my-painter)` in CSS
  → Calls registered PaintWorklet.paint() method
  → PaintWorklet has a Canvas2D context → paints pixels
  → Returns ImageBitmap → used as background-image value
```

**Paint Worklet is called on the paint thread — NOT the main thread.** This is critical: it runs inside the browser's rendering pipeline, completely isolated from main thread JavaScript. It cannot access the DOM, global variables, or `window`.

**Input data:** Paint Worklets receive CSS custom properties as inputs. A change to `--wave-offset: 20` in CSS triggers a repaint with the new value — the Worklet re-executes with the new property value.

```javascript
// paint-worklet.js — runs in Worklet context (not main thread, not Worker)
class WavePainter {
  // Declare CSS custom properties this painter needs
  static get inputProperties() {
    return ['--wave-color', '--wave-amplitude', '--wave-frequency'];
  }

  paint(ctx, geom, properties) {
    // ctx: Canvas2D-like context (limited API — no canvas.toDataURL() etc.)
    // geom: { width, height } of the element being painted
    // properties: CSS custom property values as CSSUnitValue

    const color = properties.get('--wave-color').toString();
    const amplitude = properties.get('--wave-amplitude').value;
    const frequency = properties.get('--wave-frequency').value;

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, geom.width, geom.height);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x < geom.width; x++) {
      const y = geom.height / 2 + Math.sin((x * frequency) / geom.width * Math.PI * 2) * amplitude;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }

    ctx.stroke();
  }
}

registerPaint('wave-background', WavePainter);
```

```javascript
// main.js — register the worklet module
if ('paintWorklet' in CSS) {
  await CSS.paintWorklet.addModule('/paint-worklet.js');
}
```

```css
/* styles.css — use the paint worklet */
.wave-card {
  background-image: paint(wave-background);
  --wave-color: #3498db;
  --wave-amplitude: 30;
  --wave-frequency: 5;
}

/* Animate the wave via CSS Custom Properties */
@keyframes wave-shift {
  from { --wave-frequency: 3; }
  to   { --wave-frequency: 8; }
}
```

#### Layout Worklet (CSS Houdini)

Layout Worklets allow custom CSS layout algorithms — like `display: masonry` before it existed natively.

```javascript
// layout-worklet.js
class MasonryLayout {
  static get inputProperties() { return ['--masonry-columns']; }

  async intrinsicSizes(children, edges, styleMap) {
    // Return intrinsic sizes for element
    return new IntrinsicSizes(0, Infinity);
  }

  async layout(children, edges, constraints, styleMap) {
    const columns = parseInt(styleMap.get('--masonry-columns'));
    const columnWidth = constraints.fixedInlineSize / columns;
    const columnHeights = new Array(columns).fill(0);

    const childFragments = await Promise.all(
      children.map((child) => child.layoutNextFragment({
        fixedInlineSize: columnWidth - 10,
      }))
    );

    childFragments.forEach((fragment) => {
      const minCol = columnHeights.indexOf(Math.min(...columnHeights));
      fragment.inlineOffset = minCol * columnWidth;
      fragment.blockOffset = columnHeights[minCol];
      columnHeights[minCol] += fragment.blockSize + 10;
    });

    return {
      childFragments,
      autoBlockSize: Math.max(...columnHeights),
    };
  }
}

registerLayout('masonry', MasonryLayout);
```

```javascript
await CSS.layoutWorklet.addModule('/layout-worklet.js');
```

```css
.masonry-grid {
  display: layout(masonry);
  --masonry-columns: 3;
}
```

#### Audio Worklet (Web Audio API)

```
Web Audio graph without Worklet:
  AudioSource → Built-in GainNode → AnalyserNode → AudioDestination
  (all processing in browser's audio graph)

Web Audio graph with AudioWorklet:
  AudioSource → [Audio Worklet Node] → AudioDestination
                      ↑
        Custom DSP code runs HERE — on the audio rendering thread
        Exact timing: fires every 128 samples at 44100Hz = every ~2.9ms
```

**AudioWorklet runs on the dedicated audio rendering thread** — separate from main thread AND from Web Workers. It must process each 128-sample block before the next block arrives — this is a hard real-time constraint.

```javascript
// audio-processor.js — AudioWorkletProcessor
class VolumeProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'gain', defaultValue: 1.0, minValue: 0, maxValue: 5 }];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const gain = parameters.gain[0]; // AudioParam value

    for (let channel = 0; channel < input.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      for (let i = 0; i < inputChannel.length; i++) {
        outputChannel[i] = inputChannel[i] * gain;
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('volume-processor', VolumeProcessor);
```

```javascript
// main.js
const audioContext = new AudioContext();
await audioContext.audioWorklet.addModule('/audio-processor.js');

const volumeNode = new AudioWorkletNode(audioContext, 'volume-processor');
const gainParam = volumeNode.parameters.get('gain');
gainParam.setValueAtTime(0.8, audioContext.currentTime);

source.connect(volumeNode).connect(audioContext.destination);
```

#### Animation Worklet (Houdini)

```javascript
// animation-worklet.js
registerAnimator('scroll-driven', class {
  animate(currentTime, effect) {
    // currentTime: scroll position (timeline)
    // effect.localTime = controls how far animation has progressed
    effect.localTime = currentTime * 0.5; // maps scroll to animation time
  }
});
```

```javascript
await CSS.animationWorklet.addModule('/animation-worklet.js');

const scrollTimeline = new ScrollTimeline({ source: document.documentElement });
const animation = new WorkletAnimation('scroll-driven',
  new KeyframeEffect(element, [{ opacity: 0 }, { opacity: 1 }], 1000),
  scrollTimeline
);
animation.play();
```

### Architecture & Component Boundaries

```
Browser Architecture:
┌───────────────────────────────────────────────────────────────────┐
│ Main Thread                                                        │
│  JS Execution → DOM → CSSOM → Style → (triggers worklets)        │
│                                                                    │
│  CSS.paintWorklet.addModule()  → registers paint worklet          │
│  CSS.layoutWorklet.addModule() → registers layout worklet         │
│  audioContext.audioWorklet.addModule() → registers audio worklet  │
└───────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐  ┌──────────────────────────────┐
│  Paint / Compositor Thread   │  │  Audio Rendering Thread      │
│  ─────────────────────────   │  │  ────────────────────────    │
│  paint() called per element │  │  process() every 128 samples │
│  Canvas2D context (restricted)   Hard real-time constraint     │
│  No DOM access              │  │  No DOM access               │
│  Receives CSS custom props  │  │  Receives AudioParam values  │
└──────────────────────────────┘  └──────────────────────────────┘
```

### Data Flow & State Flow

**Paint Worklet data flow:**
```
CSS Custom Property changes (e.g. --wave-color: red)
      ↓
Browser style recalculation
      ↓
Element needs repaint → browser calls PaintWorklet.paint(ctx, geom, properties)
      ↓
Worklet reads properties.get('--wave-color') → 'red'
      ↓
Draws to ctx (Canvas2D)
      ↓
Result composited into rendered frame
```

**Audio Worklet data flow:**
```
Audio source produces PCM samples
      ↓
Every 128 samples (~2.9ms at 44100Hz) → AudioWorkletProcessor.process() called
      ↓
Processor reads input buffers → applies custom DSP → writes output buffers
      ↓
Output sent to next node in audio graph → eventually to speakers
```

### Performance Implications

| Worklet Type | Thread | Latency | DOM Access |
|---|---|---|---|
| Paint Worklet | Compositor/paint thread | Per repaint only | No |
| Layout Worklet | Layout thread | Per layout calculation | No |
| Audio Worklet | Audio rendering thread | Every 128 samples (~3ms) | No |
| Animation Worklet | Compositor thread | Per animation frame | No |

**Paint Worklet performance advantage:**
- Without Worklet: custom visual effects require Canvas elements on main thread, or SVG filters, or multiple layered `<div>` elements — all main thread
- With Worklet: painting happens on compositor/paint thread — main thread is not involved at all during repaints driven by CSS custom property animation
- `will-change: transform` or `will-change: background-image paint(my-painter)` can isolate the element to its own GPU layer, making repaints free of layout/style recalculation

### Scalability Considerations

- **< 10K users:** Paint Worklets for complex backgrounds/borders where multiple gradient layers would be less flexible. Feature-detect with `'paintWorklet' in CSS`.
- **100K users:** Use Paint Worklets to offload generative visual effects from main thread animations — meaningful INP improvement for animation-heavy dashboards.
- **10M+ users (Adobe-scale):** Audio Worklets for in-browser audio effects processing. Paint Worklets for custom-rendered elements in design tools. Both types allow complex UI without main thread load.

### Trade-offs

| Worklet | Canvas element (main thread) | CSS backdrop-filter |
|---|---|---|
| Painter on compositor thread | Painter on main thread | GPU-accelerated, limited control |
| Custom arbitrary logic | Custom arbitrary logic | Fixed set of filter operations |
| No DOM access | Full context access | No code required |
| CSS Custom Property driven | JavaScript driven | CSS value driven |
| Browser support required | Universal | Mostly supported |

### ⚠️ Anti-Patterns & Pitfalls

- **Using Worklets without feature detection** — `CSS.paintWorklet` is not defined in Firefox (limited support), Safari (partial). Always check `'paintWorklet' in CSS` before calling `addModule()` and provide a CSS fallback (`background-color` etc.).
- **Expensive computation in audio process() callback** — the `process()` method must complete within 128 samples (~2.9ms at 44KHz). Any blocking computation (array sorting, complex math) causes audio glitches (crackling/dropout). Pre-compute and pass results via `postMessage` to the processor.
- **Accessing global state in Paint Worklet** — Paint Worklets have no access to `window`, DOM, or imported modules unless the module is loaded via the Worklet's module scope. Each Worklet has its own micro-global.
- **Not providing a progressive fallback for Paint Worklets** — in CSS, `paint(my-painter)` simply has no effect if the Worklet isn't registered. Always set a fallback: `background: blue; background: paint(fancy-bg);` — browsers that don't support it use `blue`.
- **Using Layout Worklet for simple layouts** — Layout Worklets have significant overhead for simple grid/flexbox needs. They are for genuinely novel layout algorithms that CSS doesn't support yet. For masonry layout specifically, CSS `grid-template-rows: masonry` is now proposed — prefer native.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP/Angular):**
SAP UI5 relies heavily on JavaScript to produce complex chart visualisations. In a next-generation SAP analytics tool built on modern browser APIs, Paint Worklets could replace Canvas-based chart backgrounds and grid lines — the painted patterns respond to CSS custom properties (`--grid-interval`, `--chart-color`) and repaint on the compositor thread without touching main thread JavaScript. The result: smoother chart interactions with no long tasks from painting on the main thread.

**At FAANG scale:**
- **Adobe:** Adobe Express and Photoshop Web use Canvas for effects, but Paint Worklets are being adopted for dynamic background patterns driven by theme/mood variables. No longer need to update Canvas via React state — CSS custom properties drive the Worklet directly.
- **Google:** Chrome's own Houdini specification demonstrations use Paint Worklets for complex borders (squircle, wavy), backgrounds (rough paper, noise textures), and is the intended API for extending CSS without adding new CSS properties
- **Spotify/SoundCloud-style apps:** Audio Worklets for real-time audio visualisers — a VU meter or frequency analyser running on the audio thread at audio-accurate timing, without the main thread timing jitter that `requestAnimationFrame` introduces

**How it evolves with scale:**
- Small scale (< 10K users): Use Paint Worklets for custom visual effects where fallback is acceptable. Progressive enhancement approach.
- Medium scale (100K users): Paint Worklets for theme-driven component rendering (dark/light/high-contrast). Audio Worklets for built-in audio effects in audio-focused products.
- Large scale (10M+ users): Worklets reduce compositor thread load for complex visual decorations — important when rendering at high frame rates (120fps on ProMotion displays). Audio Worklets are the production standard for professional audio tools.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Worklets are thread-specific execution contexts that plug directly into browser pipeline phases. The key difference from Web Workers is: Workers are general-purpose background threads; Worklets are scoped to a specific rendering or audio pipeline step and run in that pipeline's own thread. Paint Worklets run on the compositor/paint thread — they receive a CSS-like Canvas 2D context and CSS custom property values, and they paint pixels directly into the browser's frame production pipeline without any main thread involvement. This is relevant for performant generative graphics that respond to CSS — you can animate `--noise-scale` via CSS and the Worklet repaints on the paint thread with no JavaScript on main thread at all. Audio Worklets run on the audio rendering thread — the real-time constraint is processing 128 samples every ~2.9ms. They're the production way to write custom DSP in the browser today — replacing the older ScriptProcessorNode. Layout Worklets let you write custom CSS layout algorithms, relevant for things like masonry layout before native support. The browser support caveat is real — Paint Worklets work in Chrome and Edge but not in Firefox or Safari fully. Always feature-detect and provide CSS progressively enhanced fallbacks."

### Likely Follow-up Questions
1. **How do you pass data to a Paint Worklet?** → Via CSS Custom Properties declared in `static get inputProperties()` — the Worklet receives them as `CSSUnitValue` objects in the `paint()` method's `properties` parameter
2. **Can a Paint Worklet access the DOM?** → No — strictly isolated. No `window`, no `document`, no imports that use them. Only the Canvas2D context API subset and CSS property values.
3. **What is the difference between AudioWorklet and ScriptProcessorNode?** → `ScriptProcessorNode` (deprecated) runs on the main thread from an audio callback — causes main thread jank. `AudioWorkletProcessor` runs on the dedicated audio rendering thread — no main thread involvement.
4. **What browser supports are we dealing with for CSS Houdini Worklets?** → Paint Worklet: Chrome/Edge stable, Firefox behind flag, Safari partial. Layout Worklet: Chrome only currently. Animation Worklet: Chrome/Edge only. Always feature-detect and provide fallbacks.
5. **What is the Animation Worklet useful for?** → Scroll-driven animations tied to timeline position — the animation runs on the compositor thread with no JavaScript overhead or main thread jank; essential for scroll-linked parallax at 60/120fps

### vs Alternatives
| Paint Worklet | Canvas on main thread | CSS backdrop-filter |
|---|---|---|
| Compositor thread paint | Main thread paint (jank risk) | GPU-only, no custom logic |
| CSS Custom Property driven | JS value driven | CSS value driven |
| Declarative in CSS | Imperative in JS | Declarative in CSS |
| Chrome/Edge + fallback | Universal | Mostly supported |

### How to Signal Senior Thinking
> "The architectural principle behind all Worklets is the same: keep expensive operations out of the main thread by running them inside the appropriate browser pipeline phase. Paint Worklets plug into the paint step. Audio Worklets plug into the audio render step. The CSS Houdini vision is to expose all browser rendering internals through JavaScript extension points — Paint, Layout, Parser API, Properties and Values API are part of that vision. For an interviewer at Adobe, knowing that Photoshop Web's future rendering pipeline could leverage Paint Worklets for custom brush rendering effects — running on the compositor, driven by CSS custom properties that animate on GPU — is the differentiated answer."

---

## 💻 5. Code Example
> Paint Worklet for animated noise background driven entirely by CSS custom properties

```javascript
// noise-worklet.js — Paint Worklet (Houdini)
// Demonstrates: registered paint, inputProperties, canvas usage in worklet context
// What an interviewer looks for: declarative CSS integration, property reading, canvas draw

class NoisePainter {
  static get inputProperties() {
    return ['--noise-scale', '--noise-color-1', '--noise-color-2', '--noise-opacity'];
  }

  // Simple pseudorandom noise (no Math.random — deterministic per position)
  noise(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  paint(ctx, geom, properties) {
    const scale = parseFloat(properties.get('--noise-scale')) || 4;
    const color1 = properties.get('--noise-color-1').toString() || '#3498db';
    const color2 = properties.get('--noise-color-2').toString() || '#2ecc71';
    const opacity = parseFloat(properties.get('--noise-opacity')) || 0.15;

    const { width, height } = geom;

    // Draw base gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Overlay noise pattern
    ctx.globalAlpha = opacity;
    for (let y = 0; y < height; y += scale) {
      for (let x = 0; x < width; x += scale) {
        const value = this.noise(x / scale, y / scale);
        const gray = Math.floor(value * 255);
        ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
        ctx.fillRect(x, y, scale, scale);
      }
    }

    ctx.globalAlpha = 1; // reset
  }
}

registerPaint('noise-background', NoisePainter);
```

```javascript
// main.ts — register and use the Paint Worklet
async function initPaintWorklet(): Promise<void> {
  if (!('paintWorklet' in CSS)) {
    console.info('Paint Worklets not supported — using CSS fallback');
    return; // CSS fallback is already set in stylesheet
  }
  await CSS.paintWorklet.addModule(
    new URL('./noise-worklet.js', import.meta.url).toString()
  );
}

initPaintWorklet();
```

```css
/* styles.css — progressive enhancement */
.hero-card {
  /* Fallback for unsupported browsers */
  background: linear-gradient(135deg, #3498db, #2ecc71);

  /* Paint Worklet (overrides fallback in supporting browsers) */
  background: paint(noise-background);

  --noise-scale: 3;
  --noise-color-1: #3498db;
  --noise-color-2: #2ecc71;
  --noise-opacity: 0.12;
}

/* Animate the scale via CSS Custom Properties — Paint Worklet repaints on compositor thread */
@keyframes noise-breathe {
  0%, 100% { --noise-scale: 3; }
  50%       { --noise-scale: 6; }
}

.hero-card:hover {
  animation: noise-breathe 2s ease-in-out infinite;
}
```

**Interview vs Production difference:**
In an interview, write the `registerPaint` class with `inputProperties` and `paint()` — that's the full API. In production: register CSS custom properties formally using `CSS.registerProperty()` for type safety and transition support; use `@property` CSS rule for declarative property registration; add comprehensive browser fallbacks; measure impact on compositor thread pressure with Chrome DevTools Rendering panel (show paint flashing, layer borders).

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** Worklets are JavaScript plugins for browser pipeline stages — Paint Worklet hooks into the paint step, Audio Worklet hooks into the audio render step, Layout Worklet hooks into the layout step.

**If you go blank:** "Worklets are like Web Workers but scoped to a specific browser pipeline phase. Paint Worklet runs on the compositor thread and lets you write custom CSS painting logic with a Canvas 2D context. Audio Worklet runs on the audio thread for real-time DSP. Both run off the main thread with no DOM access."

**Mnemonic:** **PLAN = Paint, Layout, Audio, aNimation** — the four Worklet types, each hooked into its pipeline phase

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Complex visual effects and real-time audio processing run on dedicated threads — no main thread jank regardless of visual complexity
→ Performance: Paint Worklets move generative image rendering to the compositor thread; Audio Worklets eliminate the audio dropout/crackle from main thread ScriptProcessorNode
→ Business: CSS Houdini Worklets are the foundation for the next generation of design system component APIs where visual effects are CSS-first, thread-safe, and progressively enhanced

**How it works (3 sentences):**
Worklets are isolated, lightweight JavaScript execution contexts that plug directly into specific browser pipeline phases — the paint thread for Paint Worklets, the layout thread for Layout Worklets, and the audio rendering thread for Audio Worklets. They are intentionally less powerful than Web Workers — no DOM access, no arbitrary imports — because they run synchronously within high-frequency browser pipeline steps that cannot tolerate blocking. Data is passed in via CSS custom properties (Paint/Layout/Animation Worklets) or AudioParam/postMessage (Audio Worklets), keeping the worklet code pure and deterministic.

**Company relevance:**
- **Microsoft:** CSS Houdini Worklets are a Chromium-team priority — Microsoft's Edge team ships and maintains Paint/Animation Worklets in Blink; expect questions about CSS Properties and Values API (`CSS.registerProperty()`) alongside Paint Worklets
- **Adobe:** Paint Worklets for generative backgrounds and effects in Express/Photoshop Web; Audio Worklets for in-browser audio effects in audio products; this is a genuine current-use-case topic at Adobe interviews
- **Salesforce:** More peripheral — Layout Worklets could power custom Dashboard arrangement algorithms in Salesforce Analytics; generally less relevant here vs PWA/performance topics
- **Cisco:** Less relevant for standard monitoring tools; could apply Audio Worklets for notification sounds or alarm audio tones in network operations center applications

---
**✅ Topic 42/486 complete.**

---

## ✅ SEQ 2 COMPLETE — 21 Topics Done (Topics 22–42)

**SEQ 2: Browser & Web Platform Internals — All 21 topics complete:**
- 22. How the Browser Works
- 23. Browser Process Architecture
- 24. Critical Rendering Path
- 25. HTML Parsing, CSSOM, Render Tree
- 26. Reflows vs Repaints
- 27. GPU vs CPU Rendering
- 28. Compositing Layers & will-change
- 29. Browser Resource Prioritization
- 30. Avoiding Layout Thrashing
- 31. Memory Management in Browser
- 32. Browser Storage Options Overview
- 33. Storage Quotas & Eviction Policies
- 34. Origin Private File System (OPFS)
- 35. Network Stack Basics
- 36. HTTP/1.1 vs HTTP/2 vs HTTP/3
- 37. Connection Reuse & Head-of-Line Blocking
- 38. DNS Prefetch, Preconnect, Early Hints (103)
- 39. QUIC Protocol Basics
- 40. Web Workers
- 41. Service Workers
- 42. Worklets

---
**→ Say GO to start SEQ 3: TypeScript Deep Dive (Topics 43–58)**
