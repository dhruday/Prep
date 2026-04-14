# Meesho — SDE-2 Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meesho |
| **Role** | Frontend Engineer SDE-2 |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/meesho-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge
**Build an Image Gallery with Infinite Scroll + Search + Masonry Layout**
- Fetch images from API (paginated)
- Search/filter by tags
- Masonry layout (Pinterest-style columns)
- Click to open lightbox with image details
- Lazy loading images with intersection observer
- Skeleton loading state

### 💡 Masonry Image Gallery

```javascript
class MasonryGallery {
  constructor(container, options = {}) {
    this.container = container;
    this.fetchImages = options.fetchImages; // async (page, query) => { images, hasMore }
    this.columns = options.columns || 3;
    
    this.images = [];
    this.page = 1;
    this.query = '';
    this.loading = false;
    this.hasMore = true;
    this.lightboxImage = null;
    
    this.render();
    this.loadMore();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="gallery-app" role="main" aria-label="Image Gallery">
        <header class="gallery-header">
          <h1>Gallery</h1>
          <form class="search-form" role="search">
            <input type="search" class="search-input" 
                   placeholder="Search by tag..." 
                   value="${this._sanitize(this.query)}"
                   aria-label="Search images">
            <button type="submit" aria-label="Search">🔍</button>
          </form>
        </header>
        
        <div class="masonry-grid" role="list" aria-label="Image grid"
             style="display: grid; grid-template-columns: repeat(${this.columns}, 1fr); gap: 8px;">
          ${this.renderColumns()}
        </div>
        
        ${this.loading ? this.renderSkeleton() : ''}
        
        <div class="scroll-sentinel" aria-hidden="true"></div>
        
        ${this.lightboxImage ? this.renderLightbox() : ''}
      </div>
    `;
    
    this.setupInfiniteScroll();
    this.setupLazyLoading();
    this.attachListeners();
  }
  
  renderColumns() {
    // Distribute images into columns (shortest-column-first algorithm)
    const columnHeights = new Array(this.columns).fill(0);
    const columnItems = Array.from({ length: this.columns }, () => []);
    
    for (const img of this.images) {
      // Find shortest column
      const minIdx = columnHeights.indexOf(Math.min(...columnHeights));
      columnItems[minIdx].push(img);
      columnHeights[minIdx] += img.height / img.width; // Aspect ratio
    }
    
    return columnItems.map((items, colIdx) => `
      <div class="masonry-column" data-col="${colIdx}">
        ${items.map(img => `
          <div class="gallery-item" role="listitem" data-id="${img.id}" tabindex="0">
            <div class="img-wrapper" style="padding-bottom: ${(img.height / img.width * 100).toFixed(1)}%">
              <img data-src="${this._sanitize(img.url)}" 
                   alt="${this._sanitize(img.title || 'Image')}"
                   class="lazy-image"
                   loading="lazy">
              <div class="shimmer"></div>
            </div>
            <div class="item-overlay">
              <span class="item-title">${this._sanitize(img.title || '')}</span>
              ${img.tags ? `<div class="item-tags">${img.tags.slice(0, 3).map(t => 
                `<span class="tag">${this._sanitize(t)}</span>`).join('')}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');
  }
  
  renderSkeleton() {
    return `
      <div class="skeleton-grid" aria-hidden="true" style="display:grid;grid-template-columns:repeat(${this.columns},1fr);gap:8px">
        ${Array.from({ length: this.columns * 2 }, () => `
          <div class="skeleton-item">
            <div class="skeleton-rect" style="padding-bottom:${80 + Math.random() * 60}%"></div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  renderLightbox() {
    const img = this.lightboxImage;
    return `
      <div class="lightbox-overlay" role="dialog" aria-modal="true" 
           aria-label="Image preview: ${this._sanitize(img.title)}">
        <button class="lightbox-close" aria-label="Close preview">&times;</button>
        <div class="lightbox-content">
          <img src="${this._sanitize(img.url)}" alt="${this._sanitize(img.title || 'Image')}"
               class="lightbox-image">
          <div class="lightbox-info">
            <h2>${this._sanitize(img.title || 'Untitled')}</h2>
            ${img.description ? `<p>${this._sanitize(img.description)}</p>` : ''}
            ${img.tags ? `<div class="tags">${img.tags.map(t => 
              `<span class="tag">${this._sanitize(t)}</span>`).join('')}</div>` : ''}
            ${img.author ? `<p class="author">By ${this._sanitize(img.author)}</p>` : ''}
          </div>
        </div>
        <button class="lightbox-prev" aria-label="Previous image">‹</button>
        <button class="lightbox-next" aria-label="Next image">›</button>
      </div>
    `;
  }
  
  setupInfiniteScroll() {
    const sentinel = this.container.querySelector('.scroll-sentinel');
    if (!sentinel) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !this.loading && this.hasMore) {
          this.loadMore();
        }
      },
      { rootMargin: '500px' } // Start loading 500px before sentinel is visible
    );
    
    observer.observe(sentinel);
    this._scrollObserver = observer;
  }
  
  setupLazyLoading() {
    const images = this.container.querySelectorAll('.lazy-image');
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.onload = () => {
              img.classList.add('loaded');
              img.parentElement.querySelector('.shimmer')?.remove();
            };
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: '200px' }
    );
    
    images.forEach(img => observer.observe(img));
  }
  
  async loadMore() {
    if (this.loading || !this.hasMore) return;
    
    this.loading = true;
    this.updateLoadingUI();
    
    try {
      const result = await this.fetchImages(this.page, this.query);
      this.images.push(...result.images);
      this.hasMore = result.hasMore;
      this.page++;
    } catch (err) {
      console.error('Failed to load images:', err);
    } finally {
      this.loading = false;
      this.render();
    }
  }
  
  updateLoadingUI() {
    // Add skeleton without full re-render
    const skeleton = document.createElement('div');
    skeleton.innerHTML = this.renderSkeleton();
    this.container.querySelector('.gallery-app')?.appendChild(skeleton.firstElementChild);
  }
  
  search(query) {
    this.query = query;
    this.images = [];
    this.page = 1;
    this.hasMore = true;
    this.render();
    this.loadMore();
  }
  
  openLightbox(imageId) {
    this.lightboxImage = this.images.find(i => i.id === imageId);
    this.render();
    
    // Trap focus
    const overlay = this.container.querySelector('.lightbox-overlay');
    overlay?.focus();
    
    // ESC to close
    this._escHandler = (e) => {
      if (e.key === 'Escape') this.closeLightbox();
    };
    document.addEventListener('keydown', this._escHandler);
  }
  
  closeLightbox() {
    this.lightboxImage = null;
    document.removeEventListener('keydown', this._escHandler);
    this.render();
  }
  
  navigateLightbox(direction) {
    const currentIdx = this.images.findIndex(i => i.id === this.lightboxImage.id);
    const newIdx = currentIdx + direction;
    
    if (newIdx >= 0 && newIdx < this.images.length) {
      this.lightboxImage = this.images[newIdx];
      this.render();
    }
  }
  
  attachListeners() {
    // Search
    const form = this.container.querySelector('.search-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('.search-input');
      this.search(input.value.trim());
    });
    
    // Click to open lightbox
    this.container.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', () => this.openLightbox(item.dataset.id));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.openLightbox(item.dataset.id);
      });
    });
    
    // Lightbox controls
    this.container.querySelector('.lightbox-close')?.addEventListener('click', () => this.closeLightbox());
    this.container.querySelector('.lightbox-overlay')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('lightbox-overlay')) this.closeLightbox();
    });
    this.container.querySelector('.lightbox-prev')?.addEventListener('click', () => this.navigateLightbox(-1));
    this.container.querySelector('.lightbox-next')?.addEventListener('click', () => this.navigateLightbox(1));
    
    // Keyboard nav in lightbox
    this.container.querySelector('.lightbox-overlay')?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.navigateLightbox(-1);
      if (e.key === 'ArrowRight') this.navigateLightbox(1);
    });
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- Meesho FE = **Masonry gallery + infinite scroll + lightbox + lazy loading**
- **Masonry shortest-column-first**: calculate column heights using aspect ratios — add each image to shortest column
- **Aspect ratio trick**: `padding-bottom: ${height/width * 100}%` — reserves space before image loads, prevents CLS
- **Lazy loading dual approach**: `loading="lazy"` (native) + IntersectionObserver for `data-src` swap
- **Infinite scroll**: IntersectionObserver on sentinel element with `rootMargin: '500px'` — prefetch ahead
- **Skeleton loading**: random heights for skeleton items — mimics real layout variety
- **Lightbox keyboard nav**: ArrowLeft/Right for prev/next, Escape to close — standard a11y pattern
- Meesho FE: **e-commerce visual UI** — galleries, product grids, lazy loading are common asks

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Masonry, Infinite Scroll, Lightbox |
| Technical | Medium-Hard | JS, React, Performance |
| HM | Medium | Culture Fit |
