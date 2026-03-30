# 231 – Image Carousel

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

An Image Carousel (slider/slideshow) is a UI component that displays a series of images or content panels in a horizontally scrollable container, typically with navigation controls (prev/next buttons, dots, swipe gestures). It's a deceptively complex frontend design problem because it touches **performance** (lazy loading, image optimization), **accessibility** (screen reader announcements, keyboard navigation, pause control), **touch/gesture handling**, **animation performance** (GPU compositing), and **responsive design**. The key architectural decision is whether to use CSS scroll-snap (native, performant) or JavaScript-driven transforms (more control, more complexity).

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture & Component Boundaries

```
┌──────────────────────────────────┐
│          Carousel                │
│  ┌────────────────────────────┐  │
│  │      CarouselTrack         │  │  ← overflow: hidden
│  │  ┌──────┐┌──────┐┌──────┐ │  │  ← transform: translateX()
│  │  │Slide1││Slide2││Slide3│ │  │
│  │  └──────┘└──────┘└──────┘ │  │
│  └────────────────────────────┘  │
│  ◀ [Prev]        [Next] ▶       │
│       ● ○ ○ ○  (indicators)     │
└──────────────────────────────────┘
```

### Two Implementation Approaches

**1. CSS Scroll-Snap (Preferred for most cases):**
```css
.carousel-track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.slide {
  scroll-snap-align: start;
  flex: 0 0 100%;
}
```
- ✅ Native scrolling (60fps), touch-friendly, momentum scrolling
- ✅ No JavaScript needed for basic functionality
- ❌ Limited control over animations, no auto-play control

**2. JavaScript Transform (For advanced requirements):**
```typescript
// GPU-accelerated slide
track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
track.style.transition = 'transform 0.3s ease-out';
```
- ✅ Full animation control, auto-play, infinite loop
- ❌ Must handle touch events manually, potential jank

### Performance Implications

- **Lazy load offscreen images**: Only load current slide + 1 ahead. Use `loading="lazy"` or Intersection Observer.
- **Use `will-change: transform`** on the track element — promotes to compositor layer
- **srcset + sizes**: Serve appropriately sized images for the carousel viewport
- **Preload first image**: `<link rel="preload" as="image">` for LCP improvement
- **CLS impact**: Set explicit width/height or aspect-ratio on slides to prevent layout shift

### Accessibility Requirements (WCAG)

- `role="region"` with `aria-label="Image carousel"` on the container
- `aria-roledescription="carousel"` (ARIA 1.2)
- Each slide: `role="group"` with `aria-roledescription="slide"` and `aria-label="Slide 1 of 5"`
- Prev/Next buttons with `aria-label="Previous slide"` / `"Next slide"`
- **Auto-play MUST have a pause button** (WCAG 2.2.2 — Pause, Stop, Hide)
- `aria-live="polite"` on a live region announcing current slide
- Keyboard: Arrow keys navigate slides, Tab reaches controls

### Anti-Patterns

- ❌ Auto-advancing without pause control — WCAG violation
- ❌ Loading all images upfront — wastes bandwidth, hurts LCP
- ❌ Using JavaScript for scrolling when CSS scroll-snap suffices
- ❌ Carousel with no keyboard navigation
- ❌ Using `margin-left` for animation instead of `transform` — triggers layout, causes jank

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Adobe Creative Cloud
Adobe's asset previewer uses a carousel with lazy-loaded high-res images. They preload the first image for instant display and use Intersection Observer to load subsequent slides. The carousel respects `prefers-reduced-motion` by disabling transition animations.

### Hruday @ SAP Labs
At SAP, Fiori apps use carousel-style navigation for onboarding flows and product image galleries. We used the UI5 `sap.m.Carousel` control which handles touch gestures and keyboard navigation natively — understanding these internals maps directly to building one from scratch.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"I'd start by asking: does this need auto-play, infinite loop, or touch gestures? For most cases, I'd use CSS scroll-snap as the foundation — it gives native 60fps scrolling with momentum on mobile, zero JavaScript for the core interaction. I'd wrap it in a container with `overflow-x: auto`, `scroll-snap-type: x mandatory`, and each slide with `scroll-snap-align: start`.*

*For navigation, I'd add Prev/Next buttons and dot indicators. The container gets `role='region'` with `aria-roledescription='carousel'`, each slide gets `role='group'` with `aria-roledescription='slide'` and `aria-label='Slide 1 of 5'`.*

*Performance: I lazy-load images using `loading='lazy'` on all slides except the first. I preload the first image with `<link rel='preload'>` for LCP. Each slide has explicit aspect-ratio to prevent CLS.*

*If auto-play is required, I add a pause button (WCAG 2.2.2 requirement) and use `useRef` for the interval timer, clearing it on unmount and when the user interacts. At SAP, our Fiori onboarding carousel used similar patterns."*

### Likely Follow-up Questions

1. **"How would you implement infinite loop?"** — Duplicate first/last slides, translateX jumps without transition when reaching clones.
2. **"How do you handle touch gestures?"** — With CSS scroll-snap, they're free. With JS: track touchstart/touchmove/touchend, calculate delta, animate with requestAnimationFrame.
3. **"What about SEO for carousel images?"** — All images should be in the DOM (not dynamically injected), with proper `alt` text. Use structured data (ImageGallery schema).

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Accessible Image Carousel — React + CSS Scroll-Snap
function Carousel({ slides }: { slides: { src: string; alt: string }[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollToSlide = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const slideWidth = track.offsetWidth;
    track.scrollTo({ left: index * slideWidth, behavior: 'smooth' });
    setCurrentIndex(index);
  };

  return (
    <section role="region" aria-roledescription="carousel" aria-label="Image gallery">
      <div
        ref={trackRef}
        className="carousel-track" // overflow-x:auto; scroll-snap-type:x mandatory;
        onScroll={(e) => {
          const index = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
          setCurrentIndex(index);
        }}
      >
        {slides.map((slide, i) => (
          <div key={i} role="group" aria-roledescription="slide" 
               aria-label={`Slide ${i + 1} of ${slides.length}`}
               className="slide"> {/* scroll-snap-align: start; flex: 0 0 100%; */}
            <img src={slide.src} alt={slide.alt} loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
      </div>
      <button aria-label="Previous slide" onClick={() => scrollToSlide(Math.max(0, currentIndex - 1))}>◀</button>
      <button aria-label="Next slide" onClick={() => scrollToSlide(Math.min(slides.length - 1, currentIndex + 1))}>▶</button>
      <div role="tablist" aria-label="Slide indicators">
        {slides.map((_, i) => (
          <button key={i} role="tab" aria-selected={i === currentIndex}
                  aria-label={`Go to slide ${i + 1}`} onClick={() => scrollToSlide(i)} />
        ))}
      </div>
      <div aria-live="polite" className="sr-only">Slide {currentIndex + 1} of {slides.length}</div>
    </section>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Carousel = Scroll-Snap + Lazy Load + ARIA Carousel Pattern."** Default to CSS scroll-snap (free 60fps). Lazy load all images except the first (preload that one). Must have: pause button for auto-play (WCAG 2.2.2), keyboard navigation, `aria-roledescription="carousel"` on container, `aria-roledescription="slide"` on each panel. Performance: `will-change: transform`, explicit dimensions to prevent CLS.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
→ Carousels test CSS animation performance, accessibility knowledge, and image optimization — three areas where senior engineers must demonstrate depth.

**How it works:**
→ Container with overflow hidden + scroll-snap for native scrolling, or transform-based animation for full control. Images lazy-loaded except the first (preloaded for LCP). Accessibility via ARIA carousel pattern with slide groups, keyboard navigation, and pause control.

**Company relevance:**
→ **Adobe**: Image-heavy products, expect deep knowledge of responsive images and performance
→ **Microsoft**: Teams/SharePoint use carousels, accessibility is ship-blocking
→ **Salesforce**: Lightning components include carousel patterns
→ **Cisco**: Dashboard tiles use carousel-like navigation
