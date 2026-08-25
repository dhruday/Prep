# Flipkart — Senior FE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | UI Engineer 3 |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (JS + Machine Coding + FE System Design + HM)
- **Timeline:** 2.5 weeks
- **Format:** On-site

## Round 2: Machine Coding — Build a Product Image Carousel with Zoom

### Problem
Build an e-commerce product image carousel:
- Horizontal thumbnail strip with active indicator
- Main image display with smooth slide transitions
- Hover-to-zoom on desktop (lens style)
- Pinch-to-zoom on mobile (touch events)
- Keyboard navigation (arrow keys)
- Lazy loading for off-screen images

### 💡 Interview-Ready Answer

```javascript
class ProductImageCarousel {
  constructor(container, images) {
    this.container = container;
    this.images = images; // [{ src, thumb, alt }]
    this.currentIndex = 0;
    this.isZooming = false;
    this.zoomLevel = 2.5;
    this.touchState = { startDist: 0, scale: 1 };

    this.render();
    this.setupKeyboard();
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'carousel-container';
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', 'Product images');

    this.renderMainImage();
    this.renderThumbnails();
    this.renderNavButtons();
  }

  renderMainImage() {
    this.mainArea = document.createElement('div');
    this.mainArea.className = 'carousel-main';
    this.mainArea.style.cssText = 'position:relative;overflow:hidden;aspect-ratio:1;cursor:crosshair;';

    // Main image
    this.mainImg = document.createElement('img');
    this.mainImg.src = this.images[this.currentIndex].src;
    this.mainImg.alt = this.images[this.currentIndex].alt;
    this.mainImg.className = 'carousel-main-img';
    this.mainImg.style.cssText = 'width:100%;height:100%;object-fit:contain;transition:opacity 0.3s;';
    this.mainImg.draggable = false;

    // Zoom lens overlay
    this.zoomLens = document.createElement('div');
    this.zoomLens.className = 'zoom-lens';
    this.zoomLens.style.cssText = `
      position:absolute;display:none;width:150px;height:150px;
      border:2px solid #1a73e8;border-radius:50%;pointer-events:none;
      background-repeat:no-repeat;box-shadow:0 0 0 9999px rgba(0,0,0,0.3);
    `;

    this.mainArea.appendChild(this.mainImg);
    this.mainArea.appendChild(this.zoomLens);

    // Desktop hover zoom
    this.mainArea.addEventListener('mouseenter', () => this.startZoom());
    this.mainArea.addEventListener('mouseleave', () => this.endZoom());
    this.mainArea.addEventListener('mousemove', (e) => this.handleMouseZoom(e));

    // Touch pinch zoom
    this.mainArea.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.mainArea.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.mainArea.addEventListener('touchend', () => this.handleTouchEnd());

    this.container.appendChild(this.mainArea);
  }

  renderThumbnails() {
    const strip = document.createElement('div');
    strip.className = 'carousel-thumbs';
    strip.setAttribute('role', 'tablist');
    strip.style.cssText = 'display:flex;gap:8px;overflow-x:auto;padding:8px 0;';

    this.images.forEach((img, i) => {
      const thumb = document.createElement('button');
      thumb.className = `carousel-thumb ${i === this.currentIndex ? 'active' : ''}`;
      thumb.setAttribute('role', 'tab');
      thumb.setAttribute('aria-selected', i === this.currentIndex);
      thumb.setAttribute('aria-label', `View image ${i + 1}: ${img.alt}`);
      thumb.style.cssText = `
        width:64px;height:64px;border:2px solid ${i === this.currentIndex ? '#1a73e8' : '#ddd'};
        border-radius:8px;overflow:hidden;cursor:pointer;padding:0;flex-shrink:0;
        transition:border-color 0.2s;background:none;
      `;

      // Lazy load thumbnails
      const thumbImg = document.createElement('img');
      thumbImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      thumbImg.alt = '';
      thumbImg.loading = 'lazy';
      thumbImg.src = img.thumb || img.src;
      thumb.appendChild(thumbImg);

      thumb.addEventListener('click', () => this.goTo(i));
      strip.appendChild(thumb);
    });

    this.thumbStrip = strip;
    this.container.appendChild(strip);
  }

  renderNavButtons() {
    const prevBtn = this.createNavButton('‹', 'Previous image', () => this.prev());
    prevBtn.style.cssText += 'left:8px;';
    this.mainArea.appendChild(prevBtn);

    const nextBtn = this.createNavButton('›', 'Next image', () => this.next());
    nextBtn.style.cssText += 'right:8px;';
    this.mainArea.appendChild(nextBtn);

    // Image counter
    const counter = document.createElement('div');
    counter.className = 'carousel-counter';
    counter.style.cssText = 'position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.6);color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;';
    counter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
    this.counterEl = counter;
    this.mainArea.appendChild(counter);
  }

  createNavButton(text, label, onClick) {
    const btn = document.createElement('button');
    btn.className = 'carousel-nav';
    btn.setAttribute('aria-label', label);
    btn.textContent = text;
    btn.style.cssText = `
      position:absolute;top:50%;transform:translateY(-50%);z-index:2;
      width:36px;height:36px;border-radius:50%;border:none;
      background:rgba(255,255,255,0.9);font-size:20px;cursor:pointer;
      box-shadow:0 2px 4px rgba(0,0,0,0.2);transition:background 0.2s;
    `;
    btn.addEventListener('click', onClick);
    return btn;
  }

  goTo(index) {
    if (index < 0 || index >= this.images.length) return;

    // Fade transition
    this.mainImg.style.opacity = '0';
    setTimeout(() => {
      this.currentIndex = index;
      this.mainImg.src = this.images[index].src;
      this.mainImg.alt = this.images[index].alt;
      this.mainImg.style.opacity = '1';
    }, 150);

    // Update thumbnails
    this.thumbStrip.querySelectorAll('.carousel-thumb').forEach((thumb, i) => {
      const isActive = i === index;
      thumb.className = `carousel-thumb ${isActive ? 'active' : ''}`;
      thumb.setAttribute('aria-selected', isActive);
      thumb.style.borderColor = isActive ? '#1a73e8' : '#ddd';
    });

    // Scroll active thumbnail into view
    const activeThumb = this.thumbStrip.children[index];
    activeThumb?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

    // Update counter
    this.counterEl.textContent = `${index + 1} / ${this.images.length}`;

    // Preload adjacent images
    this.preloadAdjacent(index);
  }

  next() { this.goTo(this.currentIndex + 1); }
  prev() { this.goTo(this.currentIndex - 1); }

  // === Desktop Zoom (Lens Style) ===

  startZoom() {
    this.isZooming = true;
    this.zoomLens.style.display = 'block';
    // Set zoom background image
    this.zoomLens.style.backgroundImage = `url(${this.images[this.currentIndex].src})`;
  }

  endZoom() {
    this.isZooming = false;
    this.zoomLens.style.display = 'none';
  }

  handleMouseZoom(e) {
    if (!this.isZooming) return;

    const rect = this.mainArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Position lens centered on cursor
    const lensW = 150, lensH = 150;
    const lensX = Math.max(0, Math.min(x - lensW / 2, rect.width - lensW));
    const lensY = Math.max(0, Math.min(y - lensH / 2, rect.height - lensH));

    this.zoomLens.style.left = lensX + 'px';
    this.zoomLens.style.top = lensY + 'px';

    // Background position for zoom effect
    const bgX = -(x * this.zoomLevel - lensW / 2);
    const bgY = -(y * this.zoomLevel - lensH / 2);
    this.zoomLens.style.backgroundSize = `${rect.width * this.zoomLevel}px ${rect.height * this.zoomLevel}px`;
    this.zoomLens.style.backgroundPosition = `${bgX}px ${bgY}px`;
  }

  // === Touch Pinch Zoom ===

  handleTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      this.touchState.startDist = this.getTouchDistance(e.touches);
      this.touchState.scale = 1;
    }
  }

  handleTouchMove(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = this.getTouchDistance(e.touches);
      this.touchState.scale = dist / this.touchState.startDist;
      const clampedScale = Math.max(1, Math.min(this.touchState.scale, 3));
      this.mainImg.style.transform = `scale(${clampedScale})`;
    }
  }

  handleTouchEnd() {
    if (this.touchState.scale < 1.1) {
      this.mainImg.style.transform = 'scale(1)';
    }
    this.touchState.scale = 1;
  }

  getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  // === Keyboard Navigation ===

  setupKeyboard() {
    this.container.setAttribute('tabindex', '0');
    this.container.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowLeft': this.prev(); e.preventDefault(); break;
        case 'ArrowRight': this.next(); e.preventDefault(); break;
        case 'Home': this.goTo(0); e.preventDefault(); break;
        case 'End': this.goTo(this.images.length - 1); e.preventDefault(); break;
      }
    });
  }

  preloadAdjacent(index) {
    [-1, 1, 2].forEach(offset => {
      const i = index + offset;
      if (i >= 0 && i < this.images.length) {
        const img = new Image();
        img.src = this.images[i].src;
      }
    });
  }
}

// Usage:
// const images = [
//   { src: 'product-1.jpg', thumb: 'product-1-thumb.jpg', alt: 'Product front view' },
//   { src: 'product-2.jpg', thumb: 'product-2-thumb.jpg', alt: 'Product side view' },
//   { src: 'product-3.jpg', thumb: 'product-3-thumb.jpg', alt: 'Product back view' },
// ];
// new ProductImageCarousel(document.getElementById('app'), images);
```

## 🎯 Key Takeaways
- Flipkart FE interviews revolve around **e-commerce UI** — carousel, cart, PDP components
- Lens-style zoom: CSS `background-image` on a circular overlay positioned at cursor
- Pinch-to-zoom via `touchstart`/`touchmove` with `Math.hypot` for distance
- Preload adjacent images for seamless UX
- `scrollIntoView({ inline: 'center' })` for thumbnail strip auto-scroll
- Keyboard navigation with Home/End support shows thorough accessibility thinking

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| JS Fundamentals | Medium | Closures, this binding, Promises |
| Machine Coding | Medium-Hard | DOM, Touch Events, CSS Transforms |
| FE System Design | Hard | PDP Page Architecture, Image CDN |
| HM | Medium | Behavioral, E-commerce Domain |
