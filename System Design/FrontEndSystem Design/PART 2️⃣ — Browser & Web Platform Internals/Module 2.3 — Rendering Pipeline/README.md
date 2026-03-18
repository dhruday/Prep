# Module 2.3 — Rendering Pipeline

> What triggers expensive visual updates, and how does the GPU accelerate rendering?

---

## Topics

| # | Topic | File |
|---|-------|------|
| 16 | Reflows vs Repaints | [16_Reflows_vs_Repaints.md](./16_Reflows_vs_Repaints.md) |
| 17 | GPU vs CPU Rendering | [17_GPU_vs_CPU_Rendering.md](./17_GPU_vs_CPU_Rendering.md) |
| 18 | Browser Resource Prioritization | [18_Browser_Resource_Prioritization.md](./18_Browser_Resource_Prioritization.md) |

---

## Core Concepts

- **Reflow (Layout)** — Recalculating geometry; expensive and cascading
- **Repaint** — Redrawing pixels without geometry changes; cheaper than reflow
- **Composite** — Moving GPU layers without layout/paint; cheapest of all
- **Compositor Thread** — Handles compositing off the main thread for smooth animations
- **Layer Promotion** — `will-change`, `transform: translateZ(0)` promote elements to GPU layers
- **Resource Hints** — `preload`, `prefetch`, `preconnect`, `dns-prefetch`
- **Priority Hints** — `fetchpriority="high/low"` for fine-grained resource loading control

## Why It Matters in Interviews

- Explains why `transform` and `opacity` animations are 60fps but `width`/`height` cause jank
- Explains why reading `offsetHeight` after a style change forces a synchronous reflow (layout thrashing)
- Justifies the `will-change` property as a performance hint
- Explains how browsers decide which resources to load first and why `<link rel="preload">` helps LCP
