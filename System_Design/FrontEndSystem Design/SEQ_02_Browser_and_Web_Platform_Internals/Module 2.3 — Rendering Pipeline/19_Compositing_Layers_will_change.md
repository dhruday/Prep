# Topic 23: Compositing Layers & `will-change`

---

## 1. High-Level Explanation

**Compositing** is the final step of the browser rendering pipeline where the browser **combines separately painted layers** into the final screen image using the GPU. When a browser promotes an element to its own **compositor layer**, changes to that element (transforms, opacity) can be handled entirely by the GPU without re-running layout or paint — making animations buttery smooth at 60fps.

`will-change` is a CSS property that hints to the browser that an element is about to change, prompting premature layer promotion.

---

## 2. Deep-Dive

### The Full Rendering Pipeline Revisited

```
HTML → DOM → Style Calculations → Layout → Paint → Layer Composition → Screen
              ↑ JavaScript can                        ↑ GPU-only
              trigger any stage                       (cheapest stage)
```

**Triggering different stages has wildly different costs:**

| Change | Stages Triggered | Cost |
|---|---|---|
| `element.style.width = '200px'` | Layout → Paint → Composite | Expensive (reflow) |
| `element.style.backgroundColor = 'red'` | Paint → Composite | Medium (repaint) |
| `element.style.transform = 'translateX(100px)'` | Composite only | Cheap ✅ |
| `element.style.opacity = '0.5'` | Composite only | Cheap ✅ |

### What is a Compositor Layer?

The browser maintains a **layer tree**. Most elements are on the default layer. Certain elements are promoted to their own compositor layer when:
- They have a CSS `transform` or `opacity` animation
- `will-change: transform` or `will-change: opacity`
- `position: fixed` (in most browsers)
- `<video>`, `<canvas>`, `<iframe>` tags
- Element with a CSS filter
- 3D transform applied (`translateZ(0)` — the old GPU hack)

When an element is on its own layer, the GPU can animate it independently without asking the CPU to repaint anything. The compositor thread runs independently of the main thread — so even if JavaScript is blocking the main thread, GPU animations continue smoothly.

### `will-change` — The Modern Layer Promotion API

```css
/* Tell browser: this element WILL animate transform soon */
.animated-card {
  will-change: transform;
}

/* The browser promotes it to a GPU layer BEFORE the animation starts */
/* This avoids the one-frame jank when the layer is first promoted */
```

**CPU version (jank on first frame):**
```css
/* Without will-change */
.card:hover { transform: translateY(-8px); }
/* Browser: OH! Promote layer NOW → brief composition jank on first hover */
```

**GPU version (smooth from frame 1):**
```css
/* With will-change */
.card { will-change: transform; }
.card:hover { transform: translateY(-8px); }
/* Browser: already has a GPU layer → instant smooth animation */
```

### The `will-change` Anti-Patterns

1. **Don't apply to everything** — each layer consumes GPU VRAM. `will-change: transform` on every div will exhaust VRAM on low-end devices (common in India/Southeast Asia user bases — critical for SAP enterprise customers).

2. **Don't leave it applied after the animation** — apply via JavaScript, remove when animation is done:
```javascript
element.addEventListener('animationend', () => {
  element.style.willChange = 'auto';
});
```

3. **Don't use `translateZ(0)` hack anymore** — the old GPU hack `transform: translateZ(0)` still works but `will-change: transform` is the semantic, future-proof version.

### Debugging Compositor Layers

In Chrome DevTools → Rendering → Layer Borders (checkbox) — paints yellow borders around all compositor layers. If you see the entire page in yellow, you have too many layers.

More precisely: **Layers Panel** in DevTools shows the 3D layer tree. Memory usage per layer is visible.

---

## 3. Real-World Examples

### Hruday's SAP Dashboard — Animated Charts

At SAP Labs, our analytics dashboard had charts that re-rendered on data updates. Initial implementation used `top`/`left` CSS transitions (triggered full reflow). After switching to `transform: translate()` with `will-change: transform` on chart containers:
- Jank during chart updates eliminated
- Frame rate held at 60fps during animations
- Core Web Vitals INP dropped from 340ms to 85ms

### Infinite Scroll Feed at Scale

Cards being revealed in infinite scroll: applying `will-change: transform` as the card enters the viewport (via IntersectionObserver), animating in with `transform: translateY`, then removing `will-change` after the animation ends.

---

## 4. Interview-Oriented Answer

**Q: "How does compositing improve animation performance? Why should you prefer `transform` over `top/left`?"**

> **Answer:** The browser rendering pipeline has multiple stages — layout, paint, and composite. Triggering layout (changing geometry — width, height, top, left) is the most expensive because the browser must recalculate all affected elements' positions. Triggering paint (changing visuals — colour, shadows) is cheaper but still uses the CPU.
>
> `transform` and `opacity` changes bypass both layout and paint entirely — they're handled in the **compositor stage** by the GPU. The GPU can animate layers at 60fps independently of the main JavaScript thread. Even if your app's JavaScript is busy processing data, a GPU-composited animation continues smoothly.
>
> `will-change: transform` hints to the browser to promote the element to a compositor layer beforehand, avoiding the one-frame jank cost of layer creation at animation start.
>
> The caveat: every compositor layer consumes GPU VRAM. On mobile devices and enterprise laptops with integrated GPUs, excessive layer promotion causes memory pressure — so apply `will-change` selectively and remove it after animations complete.

---

## 5. Code Example

```typescript
// Pattern: Apply will-change before animation, remove after
// Used in SAP dashboard for animated metric cards

class AnimatedCard extends HTMLElement {
  private readonly card: HTMLElement;

  animateIn(): void {
    this.card.style.willChange = 'transform, opacity';
    this.card.style.transform = 'translateY(20px)';
    this.card.style.opacity = '0';
    
    // Force a reflow to ensure starting state is applied
    this.card.getBoundingClientRect();
    
    this.card.style.transition = 'transform 300ms ease-out, opacity 300ms ease-out';
    this.card.style.transform = 'translateY(0)';
    this.card.style.opacity = '1';
    
    this.card.addEventListener('transitionend', () => {
      // Crucial: remove will-change to free GPU VRAM
      this.card.style.willChange = 'auto';
    }, { once: true });
  }
}

// IntersectionObserver pattern for feed cards
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const card = entry.target as HTMLElement;
        card.style.willChange = 'transform, opacity';
        card.classList.add('visible'); // triggers CSS animation
        
        card.addEventListener('animationend', () => {
          card.style.willChange = 'auto'; // cleanup VRAM
          revealObserver.unobserve(card);
        }, { once: true });
      }
    });
  },
  { rootMargin: '50px' }
);
```

```css
/* Performance-correct animation — composite-only */
.card {
  /* will-change set via JS, not static CSS */
  transform: translateY(30px);
  opacity: 0;
  transition: none;
}

.card.visible {
  transform: translateY(0);   /* compositor layer — no layout/paint */
  opacity: 1;                  /* compositor layer — no layout/paint */
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 300ms ease-out;
}

/* WRONG — triggers layout on every animation frame */
.card-wrong {
  top: 30px;           /* forces layout recalculation */
  left: 0;
  transition: top 300ms; /* expensive! */
}
```

---

## 6. Memory Aid

**"The GPU Elevator" — Only `transform` and `opacity` take the fast elevator (GPU-only)**

- `width/height/top/left` → Full stairs (Layout + Paint + Composite) — slow
- `background-color/box-shadow` → Middle stairs (Paint + Composite) — medium
- `transform/opacity` → Express elevator (Composite only) — fast ✅

**`will-change` = "Reserve my seat on the elevator NOW" (before the animation starts)**

**Warning: Too many reserved seats = GPU VRAM overflow on mobile**

---

## 7. Why & How Summary

**Why compositing matters:**
- Compositor thread is independent of main thread — GPU animations survive JavaScript blocking
- `transform` + `opacity` are the ONLY CSS properties that skip layout and paint
- `will-change` avoids the cold-start layer promotion jank

**How it works:**
1. Browser promotes element to own GPU layer (via `will-change`, transform animation, or implicit reasons)
2. Each frame, compositor combines all layers using GPU blending
3. Result: 60fps animation without touching main thread

**The golden rule:** For animations — always `transform` over `top/left/width`. Apply `will-change` via JavaScript before animation start, remove on `animationend`/`transitionend`.
