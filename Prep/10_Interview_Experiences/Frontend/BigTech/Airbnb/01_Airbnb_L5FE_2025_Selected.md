# Airbnb — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Airbnb |
| **Role** | Senior Frontend Engineer |
| **Level** | L5 / IC5 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Remote (US) |
| **Source** | [Medium](https://medium.com/tag/interview-experience) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + Frontend Architecture + Cross-Functional)
- **Timeline:** 3 weeks
- **Format:** Virtual (onsite was optional)

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Build an Image Carousel with Infinite Scroll and Lazy Loading**
   - Auto-advance every 5 seconds
   - Swipe gesture support (touch events)
   - Lazy load images as they enter viewport
   - Circular navigation (last → first, first → last)

### 💡 Interview-Ready Answer

```javascript
class ImageCarousel {
  constructor(container, images, options = {}) {
    this.container = container;
    this.images = images;
    this.currentIndex = 0;
    this.autoPlayInterval = options.autoPlayMs || 5000;
    this.transitionMs = options.transitionMs || 300;
    this.isTransitioning = false;
    this.autoPlayTimer = null;

    // Touch tracking
    this.touchStartX = 0;
    this.touchDeltaX = 0;
    this.isDragging = false;

    // IntersectionObserver for lazy loading
    this.observer = null;

    this.init();
  }

  init() {
    this.render();
    this.setupLazyLoading();
    this.setupTouchEvents();
    this.setupKeyboardNav();
    this.startAutoPlay();
  }

  render() {
    this.container.innerHTML = '';
    this.container.style.cssText = `
      position: relative; overflow: hidden; width: 100%;
      aspect-ratio: 16/9; border-radius: 12px;
      touch-action: pan-y; user-select: none;
    `;

    // Track: holds all slides side by side
    this.track = document.createElement('div');
    this.track.style.cssText = `
      display: flex; transition: transform ${this.transitionMs}ms ease;
      will-change: transform; height: 100%;
    `;

    this.slides = this.images.map((src, i) => {
      const slide = document.createElement('div');
      slide.style.cssText = `
        min-width: 100%; height: 100%; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        background: #f0f0f0;
      `;

      const img = document.createElement('img');
      img.dataset.src = src; // lazy: actual src stored in data attribute
      img.alt = `Slide ${i + 1}`;
      img.style.cssText = `
        max-width: 100%; max-height: 100%; object-fit: cover;
        width: 100%; height: 100%;
      `;
      img.loading = 'lazy'; // native lazy loading fallback

      slide.appendChild(img);
      return slide;
    });

    this.slides.forEach(s => this.track.appendChild(s));
    this.container.appendChild(this.track);

    // Navigation dots
    this.dotsContainer = document.createElement('div');
    this.dotsContainer.style.cssText = `
      position: absolute; bottom: 12px; left: 50%;
      transform: translateX(-50%); display: flex; gap: 6px; z-index: 2;
    `;

    this.dots = this.images.map((_, i) => {
      const dot = document.createElement('button');
      dot.style.cssText = `
        width: 8px; height: 8px; border-radius: 50%;
        border: none; cursor: pointer; padding: 0;
        background: ${i === 0 ? '#fff' : 'rgba(255,255,255,0.5)'};
        transition: background 0.2s;
      `;
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => this.goTo(i));
      return dot;
    });

    this.dots.forEach(d => this.dotsContainer.appendChild(d));
    this.container.appendChild(this.dotsContainer);

    // Prev/Next arrows
    this.addArrow('left', '‹', () => this.prev());
    this.addArrow('right', '›', () => this.next());

    this.updatePosition(false);
  }

  addArrow(side, symbol, onClick) {
    const btn = document.createElement('button');
    btn.textContent = symbol;
    btn.setAttribute('aria-label', side === 'left' ? 'Previous' : 'Next');
    btn.style.cssText = `
      position: absolute; top: 50%; ${side}: 8px;
      transform: translateY(-50%); background: rgba(255,255,255,0.8);
      border: none; border-radius: 50%; width: 32px; height: 32px;
      font-size: 20px; cursor: pointer; z-index: 2;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s;
    `;
    this.container.addEventListener('mouseenter', () => btn.style.opacity = '1');
    this.container.addEventListener('mouseleave', () => btn.style.opacity = '0');
    btn.addEventListener('click', onClick);
    this.container.appendChild(btn);
  }

  // ============================
  //  Lazy Loading
  // ============================
  setupLazyLoading() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              delete img.dataset.src;
              this.observer.unobserve(img);
            }
          }
        });
      },
      { root: this.container, rootMargin: '100px' }
    );

    // Observe all images
    this.slides.forEach(slide => {
      const img = slide.querySelector('img');
      if (img) this.observer.observe(img);
    });

    // Eagerly load current and adjacent slides
    this.preloadAdjacent();
  }

  preloadAdjacent() {
    const indices = [
      this.currentIndex,
      (this.currentIndex + 1) % this.images.length,
      (this.currentIndex - 1 + this.images.length) % this.images.length,
    ];
    indices.forEach(i => {
      const img = this.slides[i].querySelector('img');
      if (img && img.dataset.src) {
        img.src = img.dataset.src;
        delete img.dataset.src;
      }
    });
  }

  // ============================
  //  Touch / Swipe Gestures
  // ============================
  setupTouchEvents() {
    this.container.addEventListener('touchstart', (e) => {
      this.touchStartX = e.touches[0].clientX;
      this.isDragging = true;
      this.pauseAutoPlay();
      this.track.style.transition = 'none';
    }, { passive: true });

    this.container.addEventListener('touchmove', (e) => {
      if (!this.isDragging) return;
      this.touchDeltaX = e.touches[0].clientX - this.touchStartX;
      const offset = -(this.currentIndex * 100) + (this.touchDeltaX / this.container.offsetWidth * 100);
      this.track.style.transform = `translateX(${offset}%)`;
    }, { passive: true });

    this.container.addEventListener('touchend', () => {
      this.isDragging = false;
      this.track.style.transition = `transform ${this.transitionMs}ms ease`;

      const threshold = this.container.offsetWidth * 0.2;
      if (this.touchDeltaX > threshold) {
        this.prev();
      } else if (this.touchDeltaX < -threshold) {
        this.next();
      } else {
        this.updatePosition(true);
      }

      this.touchDeltaX = 0;
      this.startAutoPlay();
    });
  }

  // ============================
  //  Keyboard Navigation (a11y)
  // ============================
  setupKeyboardNav() {
    this.container.setAttribute('tabindex', '0');
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-roledescription', 'carousel');
    this.container.setAttribute('aria-label', 'Image carousel');

    this.container.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowLeft': this.prev(); e.preventDefault(); break;
        case 'ArrowRight': this.next(); e.preventDefault(); break;
      }
    });
  }

  // ============================
  //  Navigation
  // ============================
  next() {
    if (this.isTransitioning) return;
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updatePosition(true);
    this.preloadAdjacent();
  }

  prev() {
    if (this.isTransitioning) return;
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updatePosition(true);
    this.preloadAdjacent();
  }

  goTo(index) {
    if (this.isTransitioning || index === this.currentIndex) return;
    this.currentIndex = index;
    this.updatePosition(true);
    this.preloadAdjacent();
  }

  updatePosition(animate) {
    if (animate) {
      this.isTransitioning = true;
      this.track.style.transition = `transform ${this.transitionMs}ms ease`;
      setTimeout(() => { this.isTransitioning = false; }, this.transitionMs);
    } else {
      this.track.style.transition = 'none';
    }

    this.track.style.transform = `translateX(-${this.currentIndex * 100}%)`;

    // Update dots
    this.dots.forEach((dot, i) => {
      dot.style.background = i === this.currentIndex ? '#fff' : 'rgba(255,255,255,0.5)';
    });

    // Update aria
    this.slides.forEach((slide, i) => {
      slide.setAttribute('aria-hidden', i !== this.currentIndex);
    });
  }

  // ============================
  //  Auto-Play
  // ============================
  startAutoPlay() {
    this.pauseAutoPlay();
    this.autoPlayTimer = setInterval(() => this.next(), this.autoPlayInterval);
  }

  pauseAutoPlay() {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
  }

  destroy() {
    this.pauseAutoPlay();
    if (this.observer) this.observer.disconnect();
    this.container.innerHTML = '';
  }
}

// Usage
const container = document.getElementById('carousel');
const images = [
  'https://picsum.photos/800/450?random=1',
  'https://picsum.photos/800/450?random=2',
  'https://picsum.photos/800/450?random=3',
  'https://picsum.photos/800/450?random=4',
  'https://picsum.photos/800/450?random=5',
];
const carousel = new ImageCarousel(container, images, { autoPlayMs: 5000 });
```

**Key Implementation Details:**
- **Lazy loading:** IntersectionObserver with rootMargin for pre-loading adjacent slides
- **Touch gestures:** touchstart/move/end with 20% threshold for swipe detection
- **Circular nav:** Modulo arithmetic for wrapping indices
- **A11y:** ARIA roles, keyboard navigation, focus management
- **Performance:** `will-change: transform`, no layout thrashing, passive touch listeners

## Round 2: Frontend Architecture
**Duration:** 60 minutes | **Interviewer:** Staff Engineer

### Questions Asked
1. **Design the Frontend Architecture for Airbnb's Search & Map View**
   - Search results list + interactive map with pins
   - As user pans/zooms map, results update
   - Performance with 1000+ listings visible

### Topics Discussed
- Virtual scrolling for the listings list
- Marker clustering on the map (grid-based or quadtree)
- URL-based state for search filters (shareable URLs)
- Debounced map boundary changes to API calls
- Optimistic UI for favoriting listings

## Round 3: Coding Round 2
**Duration:** 60 minutes

### Questions Asked
1. **Build a Date Range Picker Component**
   - Two calendar views (check-in / check-out)
   - Blocked dates support
   - Min/max stay validation

## Round 4: Cross-Functional
**Duration:** 45 minutes

### Topics Discussed
- Working with designers on design system components
- Handling conflicting priorities between product and engineering
- A/B testing and experimentation culture

## 🎯 Key Takeaways
- Airbnb frontend interviews are **very practical** — build real UI components from scratch
- IntersectionObserver + lazy loading is a must-know pattern
- **Accessibility is non-negotiable** at Airbnb — always add ARIA roles and keyboard nav
- Touch event handling (swipe gestures) is frequently tested
- Architecture rounds expect deep knowledge of **state management**, **URL-driven state**, and **map rendering performance**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | Carousel, Lazy Loading, Touch Events |
| Frontend Architecture | Hard | Map + List, Virtual Scroll, Clustering |
| Coding Round 2 | Medium | Date Picker, Calendar, Validation |
| Cross-Functional | Medium | Behavioral, Collaboration |
