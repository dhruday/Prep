# 512. Image Slider Component

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
An Image Slider (also called Carousel or Slideshow) is an interactive UI component that displays a series of images or content panels, one at a time, with navigation controls (previous/next arrows, dot indicators, swipe gestures). It supports auto-play, lazy loading, keyboard navigation, touch/swipe on mobile, and infinite loop. Governed by WAI-ARIA Carousel Pattern with `role="group"` for each slide and `aria-roledescription="carousel"` on the container.

**Why it exists:**
Image sliders solve the "limited viewport, many visuals" problem — product galleries (Amazon, Flipkart), hero banners (landing pages), testimonials, and media previews. They allow users to browse multiple items in a fixed-size container without scrolling the page.

**When and where it's used:**
- E-commerce product image galleries (Amazon, zoomable product images)
- Hero banners on landing pages (marketing sites, SaaS dashboards)
- Media galleries (Google Photos, Instagram web)
- Onboarding flows (multi-step walkthrough slides)
- Testimonial carousels (social proof sections)
- Story-like previews (LinkedIn stories, news carousels)

**Role in large-scale applications:**
In design systems (Material UI, Fluent UI, Spectrum), sliders must be fully accessible (WCAG AA), performant with 50+ images (lazy loading + virtualization), responsive (touch + mouse + keyboard), and support RTL layouts. Google interviews test understanding of ARIA, keyboard navigation, touch gesture handling, performance optimization (IntersectionObserver for lazy load), and animation smoothness.

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. WAI-ARIA Carousel Pattern**

```
Role Structure:
────────────────
<section                          ← aria-roledescription="carousel"
    aria-roledescription="carousel"   aria-label="Product images"
    aria-label="Product images">

  <div aria-live="off">          ← "off" when autoplay, "polite" on manual nav
    <div role="group"            ← Each slide
         aria-roledescription="slide"
         aria-label="1 of 5">
      <img src="..." alt="Red sneakers front view" />
    </div>
    <div role="group"
         aria-roledescription="slide"
         aria-label="2 of 5"
         aria-hidden="true">     ← Hidden slides
      ...
    </div>
  </div>

  <button aria-label="Previous slide">‹</button>
  <button aria-label="Next slide">›</button>

  <div role="tablist" aria-label="Slide indicators">
    <button role="tab" aria-selected="true" aria-label="Slide 1">●</button>
    <button role="tab" aria-selected="false" aria-label="Slide 2">○</button>
  </div>
</section>
```

**Required ARIA Attributes:**

| Element | Attribute | Purpose |
|---------|-----------|---------|
| Container `<section>` | `aria-roledescription="carousel"` | Overrides "region" for screen readers |
| Container | `aria-label="..."` | Names the carousel |
| Slide container | `aria-live="off"` or `"polite"` | Controls screen reader announcements |
| Each slide `<div>` | `role="group"` | Groups slide content |
| Each slide | `aria-roledescription="slide"` | Identifies as slide |
| Each slide | `aria-label="X of N"` | Position indicator |
| Hidden slides | `aria-hidden="true"` | Hides from assistive tech |
| Dot indicators | `role="tab"`, `aria-selected` | Navigation controls |
| Dot container | `role="tablist"` | Groups indicators |
| Prev/Next buttons | `aria-label="Previous/Next slide"` | Labels icon buttons |

### **B. Keyboard Navigation**

| Key | Action |
|-----|--------|
| `Tab` | Move focus to slider, then to prev/next buttons, then to dot indicators |
| `Enter` / `Space` | Activate focused button (prev, next, dot) |
| `Arrow Left` | Previous slide (when slider focused) |
| `Arrow Right` | Next slide (when slider focused) |
| `Home` | First slide (optional) |
| `End` | Last slide (optional) |
| `Escape` | Pause autoplay (if active) |

### **C. Component API Design**

```typescript
interface SliderImage {
  src: string;
  alt: string;
  srcSet?: string;
  width: number;
  height: number;
  loading?: 'lazy' | 'eager';
}

interface ImageSliderProps {
  /** Array of images to display */
  images: SliderImage[];
  /** Enable infinite loop navigation */
  infinite?: boolean;
  /** Auto-play interval in milliseconds (0 = disabled) */
  autoPlayInterval?: number;
  /** Pause auto-play on hover */
  pauseOnHover?: boolean;
  /** Show dot indicators */
  showDots?: boolean;
  /** Show prev/next arrows */
  showArrows?: boolean;
  /** Animation duration in milliseconds */
  transitionDuration?: number;
  /** Animation easing function */
  easing?: string;
  /** Enable swipe gestures on touch devices */
  enableSwipe?: boolean;
  /** Minimum swipe distance to trigger slide change */
  swipeThreshold?: number;
  /** Number of slides visible at once */
  slidesPerView?: number;
  /** Enable lazy loading of off-screen images */
  lazyLoad?: boolean;
  /** Callback when slide changes */
  onChange?: (currentIndex: number) => void;
  /** Accessible label for the carousel */
  ariaLabel?: string;
  /** Initial slide index */
  initialIndex?: number;
  /** Enable responsive behavior */
  responsive?: { breakpoint: number; slidesPerView: number }[];
}
```

### **D. State Machine**

```
                    ┌───────────────────────────────────────────┐
                    │                                           │
                    ▼                                           │
              ┌──────────┐                                     │
  ──────────▶ │   IDLE   │ ◀─── animation complete             │
              └────┬─────┘                                     │
                   │                                           │
      click/swipe/ │ arrow key/autoplay                        │
                   ▼                                           │
              ┌──────────────┐                                 │
              │  ANIMATING   │ ─── transform: translateX(...)  │
              └──────┬───────┘                                 │
                     │                                         │
                     │ transitionend                            │
                     ▼                                         │
              ┌──────────────┐                                 │
              │  SETTLING    │ ─── update index, reset clones  │
              └──────┬───────┘                                 │
                     │                                         │
                     └─────────────────────────────────────────┘

  Auto-play:
  ┌─────────┐    hover/focus     ┌────────────┐
  │ PLAYING │ ──────────────────▶│  PAUSED    │
  │         │ ◀──────────────────│            │
  └─────────┘    leave/blur      └────────────┘
```

### **E. Infinite Loop Implementation Strategy**

```
Infinite loop uses clone slides at edges:

                    ┌─ Clone of last ─┐  ┌─ Slide 1 ─┐  ┌─ Slide 2 ─┐  ┌─ Slide 3 ─┐  ┌─ Clone of first ─┐
Actual DOM:         │     [3']        │  │    [1]     │  │    [2]     │  │    [3]     │  │      [1']         │
                    └─────────────────┘  └────────────┘  └────────────┘  └────────────┘  └──────────────────┘

Visual viewport:                         ┌──────────────────────────────┐
                                         │       Visible Slide          │
                                         └──────────────────────────────┘

When user navigates past last slide:
1. Animate to clone [1'] → visual: smooth slide right
2. On transitionend: instantly (no transition) jump to real [1]
3. User doesn't notice the jump because both are identical
```

### **F. Touch/Swipe Handling**

```typescript
interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  isDragging: boolean;
  startTime: number;
}

function useSwipe(
  ref: React.RefObject<HTMLElement>,
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  threshold: number = 50
): void {
  const state = useRef<SwipeState>({
    startX: 0, startY: 0, currentX: 0,
    isDragging: false, startTime: 0,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      state.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        currentX: e.touches[0].clientX,
        isDragging: true,
        startTime: Date.now(),
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!state.current.isDragging) return;
      state.current.currentX = e.touches[0].clientX;

      // Prevent vertical scroll if horizontal swipe
      const dx = Math.abs(state.current.currentX - state.current.startX);
      const dy = Math.abs(e.touches[0].clientY - state.current.startY);
      if (dx > dy) e.preventDefault();
    };

    const handleTouchEnd = () => {
      if (!state.current.isDragging) return;
      state.current.isDragging = false;

      const dx = state.current.currentX - state.current.startX;
      const dt = Date.now() - state.current.startTime;
      const velocity = Math.abs(dx) / dt;

      // Trigger on sufficient distance OR fast flick
      if (Math.abs(dx) > threshold || velocity > 0.5) {
        if (dx < 0) onSwipeLeft();
        else onSwipeRight();
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, onSwipeLeft, onSwipeRight, threshold]);
}
```

### **G. Anti-Patterns**

1. **Auto-playing without pause control** — WCAG 2.2.2: auto-moving content must be pausable. Provide a pause button and pause on focus/hover.
2. **No `aria-live` management** — When auto-playing, set `aria-live="off"` to prevent screen reader spam. On manual navigation, set to `"polite"`.
3. **Using `display: none` for hidden slides** — Prevents image preloading. Use `overflow: hidden` on container + `transform`.
4. **Not lazy-loading off-screen images** — All images load on mount. Use `loading="lazy"` or IntersectionObserver.
5. **Animating `left` property** — Triggers layout. Use `transform: translateX()` for compositor-only animation.
6. **Missing swipe support on mobile** — Touch users can't navigate. Always implement touch gestures alongside buttons.

────────────────────────────────────
## 3. Real-World Examples
────────────────────────────────────

### Amazon Product Gallery
- Thumbnail strip + main image + zoom on hover/click
- Lazy loads high-res images on demand
- Touch swipe on mobile, arrow keys on desktop
- Video slides mixed with images

### Google Material Design Carousel
- Uses `aria-roledescription="carousel"` pattern
- Snap scrolling with CSS `scroll-snap-type`
- Responsive: 1 slide on mobile, 3+ on desktop

### SAP (Hruday's Experience)
- SAP Fiori elements `<ui5-carousel>` follows WAI-ARIA carousel pattern
- Used in product detail pages and marketing banners
- WCAG AA compliant with full keyboard navigation

────────────────────────────────────
## 4. Interview-Oriented Answer
────────────────────────────────────

**Sample Answer (7+ years level):**

> "I'd build the image slider with three core concerns: accessibility, performance, and smooth animation.
>
> For ARIA, the container gets `aria-roledescription='carousel'` and `aria-label`. Each slide is `role='group'` with `aria-roledescription='slide'` and `aria-label='X of N'`. Hidden slides get `aria-hidden='true'`. The `aria-live` region is set to `'off'` during autoplay and `'polite'` on manual navigation to prevent screen reader spam.
>
> For keyboard: Arrow Left/Right changes slides, Tab reaches prev/next/dot controls, Enter activates them, Escape pauses autoplay.
>
> For performance: images use `loading='lazy'` with explicit `width/height` to prevent CLS. Animation uses `transform: translateX()` (compositor-only, no layout/paint). For infinite loop, I clone the first and last slides at edges — when transitioning past the boundary, the `transitionend` event fires, and I instantly (no transition) reset to the real slide.
>
> For mobile: touch events with velocity-based swipe detection — a fast flick or sufficient distance triggers the slide change."

**Likely Follow-up Questions:**

1. **"How do you implement infinite loop?"** → Clone first/last slides at edges, animate to clone, on transitionend snap to real slide (disable transition for the snap).
2. **"How do you handle images of different sizes?"** → Use `object-fit: cover` with fixed container size, or `object-fit: contain` to show full image. Set `aspect-ratio` on container.
3. **"How do you optimize for 100+ images?"** → Lazy load with IntersectionObserver, only render ±2 slides around current (virtual rendering), preload adjacent images.
4. **"What about SSR?"** → Render first slide server-side with critical CSS. Hydrate on client for interactivity. Use `<noscript>` fallback showing all images in a grid.

────────────────────────────────────
## 5. Full Working Code (TypeScript + React)
────────────────────────────────────

```typescript
import React, {
  useState, useEffect, useRef, useCallback, useMemo,
  type CSSProperties, type KeyboardEvent,
} from 'react';

// ─── Types ────────────────────────────────────────
interface SliderImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface ImageSliderProps {
  images: SliderImage[];
  autoPlayInterval?: number;
  infinite?: boolean;
  transitionDuration?: number;
  ariaLabel?: string;
}

// ─── Component ────────────────────────────────────
export function ImageSlider({
  images,
  autoPlayInterval = 0,
  infinite = true,
  transitionDuration = 400,
  ariaLabel = 'Image gallery',
}: ImageSliderProps): JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const totalSlides = images.length;

  // Clone slides for infinite loop: [lastClone, ...slides, firstClone]
  const extendedImages = useMemo(() => {
    if (!infinite) return images;
    return [images[totalSlides - 1], ...images, images[0]];
  }, [images, infinite, totalSlides]);

  // Track offset accounts for the clone at position 0
  const offset = infinite ? 1 : 0;

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
  }, [isTransitioning]);

  const nextSlide = useCallback(() => {
    if (infinite) {
      goToSlide(currentIndex + 1);
    } else {
      goToSlide(Math.min(currentIndex + 1, totalSlides - 1));
    }
  }, [currentIndex, goToSlide, infinite, totalSlides]);

  const prevSlide = useCallback(() => {
    if (infinite) {
      goToSlide(currentIndex - 1);
    } else {
      goToSlide(Math.max(currentIndex - 1, 0));
    }
  }, [currentIndex, goToSlide, infinite]);

  // Handle infinite loop boundary snap
  const handleTransitionEnd = useCallback(() => {
    setIsTransitioning(false);
    if (!infinite) return;

    if (currentIndex >= totalSlides) {
      // Past last slide → snap to first (no transition)
      setCurrentIndex(0);
    } else if (currentIndex < 0) {
      // Before first slide → snap to last (no transition)
      setCurrentIndex(totalSlides - 1);
    }
  }, [currentIndex, infinite, totalSlides]);

  // Auto-play
  useEffect(() => {
    if (autoPlayInterval <= 0 || isPaused) return;
    timerRef.current = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(timerRef.current);
  }, [autoPlayInterval, isPaused, nextSlide]);

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        prevSlide();
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextSlide();
        break;
      case 'Escape':
        setIsPaused(true);
        break;
    }
  };

  // Actual display index (handles wrap-around for dots/aria)
  const displayIndex = ((currentIndex % totalSlides) + totalSlides) % totalSlides;

  // Determine if we should animate (not during the snap reset)
  const shouldAnimate = isTransitioning || (infinite
    ? currentIndex >= 0 && currentIndex < totalSlides
    : true);

  const trackStyle: CSSProperties = {
    display: 'flex',
    transition: shouldAnimate ? `transform ${transitionDuration}ms ease-out` : 'none',
    transform: `translateX(-${(currentIndex + offset) * 100}%)`,
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ position: 'relative', overflow: 'hidden', outline: 'none' }}
    >
      {/* Live region for announcements */}
      <div
        aria-live={autoPlayInterval > 0 && !isPaused ? 'off' : 'polite'}
        aria-atomic="true"
        style={{ position: 'absolute', clip: 'rect(0,0,0,0)', width: 1, height: 1 }}
      >
        Slide {displayIndex + 1} of {totalSlides}
      </div>

      {/* Track */}
      <div ref={trackRef} style={trackStyle} onTransitionEnd={handleTransitionEnd}>
        {extendedImages.map((img, i) => (
          <div
            key={`${img.src}-${i}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${(i - offset) === displayIndex ? displayIndex + 1 : ''} of ${totalSlides}`}
            aria-hidden={i - offset !== displayIndex}
            style={{ minWidth: '100%', flexShrink: 0 }}
          >
            <img
              src={img.src}
              alt={img.alt}
              width={img.width}
              height={img.height}
              loading={Math.abs(i - offset - currentIndex) > 1 ? 'lazy' : 'eager'}
              style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
            />
          </div>
        ))}
      </div>

      {/* Prev/Next Buttons */}
      <button
        onClick={prevSlide}
        aria-label="Previous slide"
        disabled={!infinite && currentIndex === 0}
        style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }}
      >
        ‹
      </button>
      <button
        onClick={nextSlide}
        aria-label="Next slide"
        disabled={!infinite && currentIndex === totalSlides - 1}
        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
      >
        ›
      </button>

      {/* Dot Indicators */}
      <div role="tablist" aria-label="Slide indicators" style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 8 }}>
        {images.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === displayIndex}
            aria-label={`Slide ${i + 1}`}
            onClick={() => goToSlide(i)}
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i === displayIndex ? '#1a73e8' : '#ccc',
              border: 'none', cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </section>
  );
}
```

### Testing Strategy

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ImageSlider } from './ImageSlider';

expect.extend(toHaveNoViolations);

const images = [
  { src: '/img1.jpg', alt: 'First image', width: 800, height: 600 },
  { src: '/img2.jpg', alt: 'Second image', width: 800, height: 600 },
  { src: '/img3.jpg', alt: 'Third image', width: 800, height: 600 },
];

describe('ImageSlider', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<ImageSlider images={images} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('navigates to next slide on arrow right', () => {
    render(<ImageSlider images={images} />);
    const slider = screen.getByRole('region', { name: /image gallery/i });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByText('Slide 2 of 3')).toBeInTheDocument();
  });

  it('navigates via dot indicators', () => {
    render(<ImageSlider images={images} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Slide 3' }));
    expect(screen.getByText('Slide 3 of 3')).toBeInTheDocument();
  });

  it('pauses autoplay on hover', () => {
    jest.useFakeTimers();
    render(<ImageSlider images={images} autoPlayInterval={3000} />);
    const slider = screen.getByRole('region');
    fireEvent.mouseEnter(slider);
    jest.advanceTimersByTime(5000);
    // Should still be on slide 1
    expect(screen.getByText('Slide 1 of 3')).toBeInTheDocument();
    jest.useRealTimers();
  });
});
```

────────────────────────────────────
## 6. Memory Aid (Quick Recall)
────────────────────────────────────

**ARIA for carousel:** `aria-roledescription="carousel"` on container, `role="group"` + `aria-roledescription="slide"` on each slide, `aria-live="off"` during autoplay.

**Infinite loop trick:** Clone first+last slides at edges. Animate to clone. On `transitionend`, snap to real slide (no transition).

**If you go blank:** "Container with `overflow: hidden`, slides in a flex row, `transform: translateX()` for animation, cloned edges for infinite loop, lazy load off-screen images, full ARIA + keyboard support."

────────────────────────────────────
## 7. Why & How Summary
────────────────────────────────────

**Why it matters:**
→ Carousels are ubiquitous — product galleries, hero banners, onboarding flows. Getting ARIA, keyboard, touch, and performance right in one component demonstrates full-stack frontend competency.

**How it works:**
→ Slides in a flex row, container with `overflow: hidden`. `transform: translateX(-N*100%)` for animation (compositor-only). Infinite loop via cloned edge slides + transitionend snap. Lazy loading via `loading="lazy"` or IntersectionObserver. ARIA carousel pattern with live region management.

**Company relevance:**
→ **Google:** Material Design carousel, Google Shopping product gallery. Tests ARIA, keyboard, performance.
→ **Microsoft:** Fluent UI carousel component. Focus on accessibility + keyboard first.
→ **SAP (Hruday's current):** `<ui5-carousel>` in Fiori design system — WCAG AA compliant.
