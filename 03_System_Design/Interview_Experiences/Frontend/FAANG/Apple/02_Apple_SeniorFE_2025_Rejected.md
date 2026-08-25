# Apple — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Software Engineer (Frontend) — ICT3 |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone Screen + Technical + System Design + HM)
- **Rejection Reason:** Technical round — animation performance question wasn't optimal

---

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Implement a Carousel/Slider Component** (vanilla JS)
   - Infinite loop, swipe gestures, keyboard navigation, autoplay with pause on hover

### 💡 Interview-Ready Answer

```javascript
class Carousel {
  constructor(container, options = {}) {
    this.container = container;
    this.slides = [...container.querySelectorAll('.slide')];
    this.currentIndex = 0;
    this.isAnimating = false;
    this.autoplayInterval = null;
    
    this.options = {
      autoplay: options.autoplay ?? true,
      autoplayDelay: options.autoplayDelay ?? 3000,
      transitionDuration: options.transitionDuration ?? 300,
      infinite: options.infinite ?? true,
      ...options
    };
    
    this.init();
  }
  
  init() {
    // Wrap slides in a track container
    this.track = document.createElement('div');
    this.track.className = 'carousel-track';
    this.track.style.cssText = `
      display: flex; transition: transform ${this.options.transitionDuration}ms ease;
      will-change: transform;
    `;
    
    // For infinite: clone first and last slide
    if (this.options.infinite) {
      const firstClone = this.slides[0].cloneNode(true);
      const lastClone = this.slides[this.slides.length - 1].cloneNode(true);
      firstClone.setAttribute('aria-hidden', 'true');
      lastClone.setAttribute('aria-hidden', 'true');
      
      this.track.appendChild(lastClone);
      this.slides.forEach(s => this.track.appendChild(s));
      this.track.appendChild(firstClone);
      
      this.offset = 1; // Account for prepended clone
    } else {
      this.slides.forEach(s => this.track.appendChild(s));
      this.offset = 0;
    }
    
    this.container.innerHTML = '';
    this.container.appendChild(this.track);
    
    // Add controls
    this.addControls();
    this.addDots();
    this.setupA11y();
    this.setupSwipe();
    this.setupKeyboard();
    
    this.goTo(0, false); // Initial position
    
    if (this.options.autoplay) this.startAutoplay();
  }
  
  goTo(index, animate = true) {
    if (this.isAnimating) return;
    
    const totalSlides = this.slides.length;
    this.currentIndex = index;
    
    if (animate) {
      this.isAnimating = true;
      this.track.style.transition = `transform ${this.options.transitionDuration}ms ease`;
    } else {
      this.track.style.transition = 'none';
    }
    
    const translateX = -(this.currentIndex + this.offset) * 100;
    this.track.style.transform = `translateX(${translateX}%)`;
    
    if (animate) {
      setTimeout(() => {
        this.isAnimating = false;
        
        // Infinite loop: jump to real slide after clone animation
        if (this.options.infinite) {
          if (this.currentIndex >= totalSlides) {
            this.goTo(0, false); // Jump to real first
          } else if (this.currentIndex < 0) {
            this.goTo(totalSlides - 1, false); // Jump to real last
          }
        }
      }, this.options.transitionDuration);
    }
    
    this.updateDots();
    this.updateA11y();
  }
  
  next() { this.goTo(this.currentIndex + 1); }
  prev() { this.goTo(this.currentIndex - 1); }
  
  addControls() {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-prev';
    prevBtn.setAttribute('aria-label', 'Previous slide');
    prevBtn.textContent = '‹';
    prevBtn.addEventListener('click', () => { this.prev(); this.resetAutoplay(); });
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-next';
    nextBtn.setAttribute('aria-label', 'Next slide');
    nextBtn.textContent = '›';
    nextBtn.addEventListener('click', () => { this.next(); this.resetAutoplay(); });
    
    this.container.appendChild(prevBtn);
    this.container.appendChild(nextBtn);
  }
  
  addDots() {
    this.dotsContainer = document.createElement('div');
    this.dotsContainer.className = 'carousel-dots';
    this.dotsContainer.setAttribute('role', 'tablist');
    
    this.slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => { this.goTo(i); this.resetAutoplay(); });
      this.dotsContainer.appendChild(dot);
    });
    
    this.container.appendChild(this.dotsContainer);
  }
  
  updateDots() {
    const realIndex = ((this.currentIndex % this.slides.length) + this.slides.length) % this.slides.length;
    this.dotsContainer.querySelectorAll('.dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === realIndex);
      dot.setAttribute('aria-selected', i === realIndex);
    });
  }
  
  setupA11y() {
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-roledescription', 'carousel');
    this.container.setAttribute('aria-label', 'Image carousel');
    
    // Live region for screen readers
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    this.container.appendChild(this.liveRegion);
  }
  
  updateA11y() {
    const realIndex = ((this.currentIndex % this.slides.length) + this.slides.length) % this.slides.length;
    this.liveRegion.textContent = `Slide ${realIndex + 1} of ${this.slides.length}`;
  }
  
  setupSwipe() {
    let startX = 0, startY = 0, isDragging = false;
    
    this.container.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = true;
    }, { passive: true });
    
    this.container.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX;
      const diffY = endY - startY;
      
      // Only register horizontal swipes (not vertical scrolling)
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) this.prev();
        else this.next();
        this.resetAutoplay();
      }
    }, { passive: true });
  }
  
  setupKeyboard() {
    this.container.setAttribute('tabindex', '0');
    this.container.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowLeft': this.prev(); this.resetAutoplay(); break;
        case 'ArrowRight': this.next(); this.resetAutoplay(); break;
      }
    });
  }
  
  startAutoplay() {
    this.autoplayInterval = setInterval(() => this.next(), this.options.autoplayDelay);
    
    // Pause on hover/focus
    this.container.addEventListener('mouseenter', () => this.pauseAutoplay());
    this.container.addEventListener('mouseleave', () => this.startAutoplay());
    this.container.addEventListener('focusin', () => this.pauseAutoplay());
    this.container.addEventListener('focusout', () => this.startAutoplay());
  }
  
  pauseAutoplay() { clearInterval(this.autoplayInterval); }
  resetAutoplay() { this.pauseAutoplay(); if (this.options.autoplay) this.startAutoplay(); }
  
  destroy() {
    this.pauseAutoplay();
    // Remove event listeners, clean up
  }
}
```

---

## Round 2: Technical Deep Dive
**Duration:** 60 minutes

### Questions Asked
1. **Implement a smooth 60fps animation system** (without libraries)
2. **Explain layout thrashing and how to fix it**
3. **requestAnimationFrame vs CSS animations — when to use which?**

### 💡 60fps Animation System

```javascript
class AnimationEngine {
  constructor() {
    this.animations = new Map();
    this.running = false;
    this.lastFrame = 0;
  }
  
  animate(element, properties, duration, easing = 'easeOutCubic') {
    const id = Symbol();
    const startValues = {};
    const endValues = {};
    
    // Read all initial values in one batch (avoid layout thrashing)
    const computedStyle = getComputedStyle(element);
    for (const [prop, target] of Object.entries(properties)) {
      startValues[prop] = parseFloat(computedStyle[prop]) || 0;
      endValues[prop] = target;
    }
    
    return new Promise((resolve) => {
      this.animations.set(id, {
        element, startValues, endValues, duration,
        easing: this.easings[easing],
        startTime: null,
        resolve
      });
      
      if (!this.running) this.start();
    });
  }
  
  start() {
    this.running = true;
    this.tick(performance.now());
  }
  
  tick = (now) => {
    if (!this.running || this.animations.size === 0) {
      this.running = false;
      return;
    }
    
    // Batch all writes together (avoid read-write interleave)
    const updates = [];
    
    for (const [id, anim] of this.animations) {
      if (!anim.startTime) anim.startTime = now;
      
      let progress = Math.min((now - anim.startTime) / anim.duration, 1);
      const easedProgress = anim.easing(progress);
      
      const styles = {};
      // Only animate transform and opacity (compositor-friendly)
      let transform = '';
      
      for (const [prop, end] of Object.entries(anim.endValues)) {
        const start = anim.startValues[prop];
        const current = start + (end - start) * easedProgress;
        
        if (prop === 'translateX' || prop === 'translateY') {
          transform += `${prop}(${current}px) `;
        } else if (prop === 'scale') {
          transform += `scale(${current}) `;
        } else if (prop === 'opacity') {
          styles.opacity = current;
        }
      }
      
      if (transform) styles.transform = transform.trim();
      updates.push({ element: anim.element, styles });
      
      if (progress >= 1) {
        this.animations.delete(id);
        anim.resolve();
      }
    }
    
    // Apply all writes in one batch
    for (const { element, styles } of updates) {
      Object.assign(element.style, styles);
    }
    
    requestAnimationFrame(this.tick);
  };
  
  easings = {
    linear: t => t,
    easeOutCubic: t => 1 - Math.pow(1 - t, 3),
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeOutBounce: t => {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      else return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  };
}

// Layout Thrashing — BAD:
elements.forEach(el => {
  const width = el.offsetWidth;    // READ → forces layout
  el.style.width = width * 2 + 'px'; // WRITE → invalidates layout
  // Next iteration: READ again → forced synchronous layout!
});

// Layout Thrashing — FIXED (batch reads then writes):
const widths = elements.map(el => el.offsetWidth); // All reads first
elements.forEach((el, i) => {
  el.style.width = widths[i] * 2 + 'px'; // All writes second
});

// When to use CSS vs JS animations:
// CSS: simple transitions (hover, toggle), keyframes, will-change
//   → Runs on compositor thread, doesn't block main thread
// JS (rAF): complex sequences, physics-based, interactive (drag), 
//   dynamic values (scroll-linked), need to coordinate multiple elements
```

---

## 🎯 Key Takeaways
- Apple FE = **polish, animations, UX perfection** — not just "make it work"
- **Carousel with infinite loop** = clone first/last slides + jump without animation at boundaries
- **Touch/swipe** — horizontal only (check diffX > diffY), 50px minimum threshold
- **60fps animations**: only animate `transform` and `opacity` (GPU-composed, no layout)
- **Layout thrashing**: batch reads, then batch writes — never interleave
- I **got rejected** because my animation code triggered layout by animating `width` instead of `transform: scaleX()`
- **will-change: transform** tells browser to promote to compositor layer
- Apple values **polish** over feature count — fewer features, perfect execution

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | Carousel, Touch, Infinite Loop |
| Technical | Hard | 60fps Animation, Layout Thrashing, Compositor |
| System Design | Hard | Apple Music, Offline, Streaming |
| HM | Medium | Apple Values, Polish |
