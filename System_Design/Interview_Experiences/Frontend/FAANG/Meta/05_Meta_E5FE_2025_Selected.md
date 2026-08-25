# Meta — E5 Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Frontend Engineer E5 |
| **Level** | E5 |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | London, UK |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Instagram |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (2 Coding + System Design + Behavioral)

---

## Round 1: Product Coding (Meta's signature round)
**Duration:** 40 minutes

### Questions Asked
1. **Build a Photo Gallery with Lightbox** (Instagram-style)
   - Grid layout of thumbnails
   - Click thumbnail → fullscreen lightbox
   - Navigate with arrow keys and swipe
   - Preload adjacent images
   - Animation: smooth zoom from thumbnail position to fullscreen
   - Close on Escape or click outside

### 💡 Photo Gallery + Lightbox

```javascript
class PhotoGallery {
  constructor(container, images) {
    this.container = container;
    this.images = images; // [{ src, thumb, alt, width, height }]
    this.currentIndex = -1;
    this.isOpen = false;
    
    this.render();
    this.createLightbox();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="gallery-grid" role="list" aria-label="Photo gallery">
        ${this.images.map((img, i) => `
          <div class="gallery-item" role="listitem" tabindex="0" data-index="${i}">
            <img src="${this._sanitize(img.thumb)}" alt="${this._sanitize(img.alt)}" 
                 loading="lazy" width="${img.width / 4}" height="${img.height / 4}">
          </div>
        `).join('')}
      </div>
    `;
    
    // Event delegation
    this.container.querySelector('.gallery-grid').addEventListener('click', (e) => {
      const item = e.target.closest('[data-index]');
      if (item) this.openLightbox(parseInt(item.dataset.index));
    });
    
    this.container.querySelector('.gallery-grid').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const item = e.target.closest('[data-index]');
        if (item) this.openLightbox(parseInt(item.dataset.index));
      }
    });
  }
  
  createLightbox() {
    this.lightbox = document.createElement('div');
    this.lightbox.className = 'lightbox';
    this.lightbox.setAttribute('role', 'dialog');
    this.lightbox.setAttribute('aria-modal', 'true');
    this.lightbox.setAttribute('aria-label', 'Image viewer');
    this.lightbox.hidden = true;
    
    this.lightbox.innerHTML = `
      <div class="lightbox-backdrop"></div>
      <button class="lightbox-close" aria-label="Close">&times;</button>
      <button class="lightbox-prev" aria-label="Previous image">&lsaquo;</button>
      <button class="lightbox-next" aria-label="Next image">&rsaquo;</button>
      <div class="lightbox-content">
        <img class="lightbox-img" src="" alt="">
      </div>
      <div class="lightbox-counter" aria-live="polite"></div>
    `;
    
    document.body.appendChild(this.lightbox);
    
    // Close handlers
    this.lightbox.querySelector('.lightbox-close').addEventListener('click', () => this.close());
    this.lightbox.querySelector('.lightbox-backdrop').addEventListener('click', () => this.close());
    
    // Navigation
    this.lightbox.querySelector('.lightbox-prev').addEventListener('click', () => this.navigate(-1));
    this.lightbox.querySelector('.lightbox-next').addEventListener('click', () => this.navigate(1));
    
    // Keyboard
    this.lightbox.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Escape': this.close(); break;
        case 'ArrowLeft': this.navigate(-1); break;
        case 'ArrowRight': this.navigate(1); break;
      }
    });
    
    // Touch swipe
    this.setupSwipe();
  }
  
  openLightbox(index) {
    this.currentIndex = index;
    this.isOpen = true;
    
    const image = this.images[index];
    const img = this.lightbox.querySelector('.lightbox-img');
    
    // Animate from thumbnail position to fullscreen
    const thumb = this.container.querySelectorAll('[data-index]')[index];
    const thumbRect = thumb.getBoundingClientRect();
    
    // Start position: match thumbnail
    img.style.position = 'fixed';
    img.style.top = `${thumbRect.top}px`;
    img.style.left = `${thumbRect.left}px`;
    img.style.width = `${thumbRect.width}px`;
    img.style.height = `${thumbRect.height}px`;
    img.style.transition = 'none';
    img.src = image.src;
    img.alt = image.alt;
    
    this.lightbox.hidden = false;
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    
    // Animate to center
    requestAnimationFrame(() => {
      img.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      img.style.top = '50%';
      img.style.left = '50%';
      img.style.transform = 'translate(-50%, -50%)';
      img.style.width = '';
      img.style.height = '';
      img.style.maxWidth = '90vw';
      img.style.maxHeight = '90vh';
      img.style.position = '';
    });
    
    this.updateCounter();
    this.preloadAdjacentImages();
    
    // Trap focus inside lightbox
    this.lightbox.querySelector('.lightbox-close').focus();
  }
  
  navigate(direction) {
    const newIndex = this.currentIndex + direction;
    if (newIndex < 0 || newIndex >= this.images.length) return;
    
    this.currentIndex = newIndex;
    const image = this.images[newIndex];
    const img = this.lightbox.querySelector('.lightbox-img');
    
    // Slide animation
    img.style.transition = 'opacity 0.15s ease';
    img.style.opacity = '0';
    
    setTimeout(() => {
      img.src = image.src;
      img.alt = image.alt;
      img.onload = () => {
        img.style.opacity = '1';
      };
    }, 150);
    
    this.updateCounter();
    this.preloadAdjacentImages();
  }
  
  preloadAdjacentImages() {
    // Preload next and previous images
    const toPreload = [this.currentIndex - 1, this.currentIndex + 1]
      .filter(i => i >= 0 && i < this.images.length);
    
    toPreload.forEach(i => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = this.images[i].src;
      
      // Avoid duplicate preloads
      if (!document.querySelector(`link[href="${CSS.escape(this.images[i].src)}"]`)) {
        document.head.appendChild(link);
      }
    });
  }
  
  setupSwipe() {
    let startX = 0;
    let startY = 0;
    
    this.lightbox.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    
    this.lightbox.addEventListener('touchend', (e) => {
      const deltaX = e.changedTouches[0].clientX - startX;
      const deltaY = e.changedTouches[0].clientY - startY;
      
      // Only horizontal swipe (dx > dy and dx > threshold)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) this.navigate(-1); // Swipe right = prev
        else this.navigate(1); // Swipe left = next
      }
    }, { passive: true });
  }
  
  updateCounter() {
    this.lightbox.querySelector('.lightbox-counter').textContent = 
      `${this.currentIndex + 1} / ${this.images.length}`;
    
    // Hide nav buttons at edges
    this.lightbox.querySelector('.lightbox-prev').style.display = 
      this.currentIndex === 0 ? 'none' : '';
    this.lightbox.querySelector('.lightbox-next').style.display = 
      this.currentIndex === this.images.length - 1 ? 'none' : '';
  }
  
  close() {
    this.lightbox.hidden = true;
    this.isOpen = false;
    document.body.style.overflow = '';
    
    // Return focus to the thumbnail that opened the lightbox
    const thumb = this.container.querySelectorAll('[data-index]')[this.currentIndex];
    if (thumb) thumb.focus();
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

---

## Round 2: Coding
**Duration:** 40 minutes

### Questions Asked
1. **Implement `Array.prototype.flat` polyfill** (with configurable depth)
2. **Follow-up: Implement `flatMap`**

### 💡 Array.prototype.flat Polyfill

```javascript
Array.prototype.myFlat = function(depth = 1) {
  const result = [];
  
  const flatten = (arr, d) => {
    for (const item of arr) {
      if (Array.isArray(item) && d > 0) {
        flatten(item, d - 1);
      } else {
        result.push(item);
      }
    }
  };
  
  flatten(this, depth);
  return result;
};

// Iterative version (no stack overflow for Infinity depth):
Array.prototype.myFlatIterative = function(depth = 1) {
  let result = [...this];
  
  for (let d = 0; d < depth; d++) {
    let hasNestedArray = false;
    const next = [];
    
    for (const item of result) {
      if (Array.isArray(item)) {
        next.push(...item);
        hasNestedArray = true;
      } else {
        next.push(item);
      }
    }
    
    result = next;
    if (!hasNestedArray) break; // No more arrays to flatten
  }
  
  return result;
};

// flatMap = map + flat(1)
Array.prototype.myFlatMap = function(callback, thisArg) {
  return this.reduce((acc, value, index) => {
    const mapped = callback.call(thisArg, value, index, this);
    return acc.concat(mapped); // concat flattens one level
  }, []);
};

// Tests:
console.log([1, [2, [3, [4]]]].myFlat());     // [1, 2, [3, [4]]]
console.log([1, [2, [3, [4]]]].myFlat(2));     // [1, 2, 3, [4]]
console.log([1, [2, [3, [4]]]].myFlat(Infinity)); // [1, 2, 3, 4]
console.log(["hello world", "abc"].myFlatMap(s => s.split(" "))); // ["hello", "world", "abc"]
```

---

## 🎯 Key Takeaways
- Meta E5 FE = **Product Coding (lightbox) + polyfills + system design**
- **Lightbox animation**: read thumbnail `getBoundingClientRect()` → start at those coordinates → animate to center
- **Preload adjacent**: `<link rel="preload" as="image">` for next/prev images → instant navigation
- **Swipe**: detect horizontal swipe (deltaX > deltaY && deltaX > 50px threshold)
- **Focus management**: trap focus in dialog, return focus to trigger on close
- **`Array.flat`**: recursive with depth counter; iterative version for `Infinity` depth (no stack overflow)
- **`flatMap`**: reduce + concat (concat flattens one level) — more efficient than map().flat()
- Meta Product Coding: they expect a **polished, interactive UI** built quickly — practice speed

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Product Coding | Hard | Photo Gallery, Lightbox, Animation |
| Coding | Medium | Array.flat/flatMap Polyfills |
| System Design | Hard | Instagram-scale Frontend |
| Behavioral | Medium | Meta Values |
