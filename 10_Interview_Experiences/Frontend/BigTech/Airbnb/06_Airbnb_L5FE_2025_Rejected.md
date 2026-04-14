# Airbnb — L5 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Airbnb |
| **Role** | Frontend Engineer |
| **Level** | L5 (Senior) |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | San Francisco |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 On-site)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 3: Frontend Coding — Image Gallery with Masonry Layout

### Problem
Build an image gallery with:
1. Masonry (Pinterest-like) layout that fills columns efficiently
2. Lazy loading — only load images as they enter viewport
3. Lightbox overlay on click with prev/next navigation
4. Smooth fade-in animation when images load
5. Responsive columns (1-2-3-4 columns based on viewport width)
6. Loading skeleton placeholders

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Masonry Gallery</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #111; color: #fff; padding: 16px; }

.gallery { display: flex; gap: 12px; max-width: 1200px; margin: 0 auto; }
.gallery-column { flex: 1; display: flex; flex-direction: column; gap: 12px; }

.gallery-item { position: relative; border-radius: 10px; overflow: hidden; cursor: pointer; background: #222; }
.gallery-item img { width: 100%; display: block; opacity: 0; transition: opacity 0.4s ease; }
.gallery-item img.loaded { opacity: 1; }
.gallery-item:hover { transform: scale(1.02); transition: transform 0.2s; }
.gallery-item:hover .item-overlay { opacity: 1; }
.item-overlay { position: absolute; inset: 0; background: linear-gradient(transparent 60%, rgba(0,0,0,0.6)); display: flex; align-items: flex-end; padding: 12px; opacity: 0; transition: opacity 0.2s; }
.item-title { font-size: 13px; font-weight: 500; }

/* Skeleton */
.skeleton { background: linear-gradient(90deg, #222 25%, #333 50%, #222 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 10px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Lightbox */
.lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; display: none; align-items: center; justify-content: center; }
.lightbox.open { display: flex; }
.lightbox img { max-width: 90vw; max-height: 85vh; border-radius: 8px; object-fit: contain; }
.lb-close { position: absolute; top: 16px; right: 20px; background: none; border: none; color: #fff; font-size: 28px; cursor: pointer; z-index: 1001; padding: 8px; }
.lb-close:hover { opacity: 0.7; }
.lb-nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: #fff; font-size: 24px; padding: 16px 12px; cursor: pointer; border-radius: 8px; }
.lb-nav:hover { background: rgba(255,255,255,0.25); }
.lb-prev { left: 16px; }
.lb-next { right: 16px; }
.lb-counter { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); font-size: 14px; color: #aaa; }
.lb-caption { position: absolute; bottom: 48px; left: 50%; transform: translateX(-50%); font-size: 16px; font-weight: 500; text-align: center; }
</style>
</head>
<body>
<div class="gallery" id="gallery"></div>

<div class="lightbox" id="lightbox">
  <button class="lb-close" id="lbClose">✕</button>
  <button class="lb-nav lb-prev" id="lbPrev">‹</button>
  <button class="lb-nav lb-next" id="lbNext">›</button>
  <img id="lbImage" src="" alt="">
  <div class="lb-caption" id="lbCaption"></div>
  <div class="lb-counter" id="lbCounter"></div>
</div>

<script>
// ============================================================
// IMAGE DATA (placeholder images with varying heights)
// ============================================================
const IMAGES = Array.from({ length: 30 }, (_, i) => {
  const h = 200 + Math.floor(Math.random() * 300);
  const w = 400;
  const hue = (i * 37) % 360;
  return {
    id: i,
    src: `https://placehold.co/${w}x${h}/${hslToHex(hue, 60, 40)}/${hslToHex(hue, 60, 80)}?text=Photo+${i+1}`,
    title: `Photo ${i + 1}`,
    width: w,
    height: h,
    aspectRatio: h / w
  };
});

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

// ============================================================
// MASONRY LAYOUT
// ============================================================
const gallery = document.getElementById('gallery');
let observer;
let lightboxIdx = -1;

function getColumnCount() {
  const w = window.innerWidth;
  if (w < 480) return 1;
  if (w < 768) return 2;
  if (w < 1024) return 3;
  return 4;
}

function renderGallery() {
  const numCols = getColumnCount();
  gallery.innerHTML = '';

  const columns = [];
  const heights = [];
  for (let i = 0; i < numCols; i++) {
    const col = document.createElement('div');
    col.className = 'gallery-column';
    gallery.appendChild(col);
    columns.push(col);
    heights.push(0);
  }

  // Distribute images to shortest column
  IMAGES.forEach((img, idx) => {
    const minIdx = heights.indexOf(Math.min(...heights));

    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.style.aspectRatio = `${img.width}/${img.height}`;
    item.setAttribute('data-idx', idx);

    // Skeleton placeholder
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    skeleton.style.width = '100%';
    skeleton.style.paddingBottom = (img.aspectRatio * 100) + '%';
    item.appendChild(skeleton);

    // Lazy-load image
    const imgEl = document.createElement('img');
    imgEl.setAttribute('data-src', img.src);
    imgEl.alt = img.title;
    imgEl.style.position = 'absolute';
    imgEl.style.inset = '0';
    imgEl.style.width = '100%';
    imgEl.style.height = '100%';
    imgEl.style.objectFit = 'cover';
    item.style.position = 'relative';

    imgEl.addEventListener('load', () => {
      imgEl.classList.add('loaded');
      skeleton.remove();
    });

    item.appendChild(imgEl);

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'item-overlay';
    overlay.innerHTML = `<span class="item-title">${img.title}</span>`;
    item.appendChild(overlay);

    // Click → lightbox
    item.addEventListener('click', () => openLightbox(idx));

    columns[minIdx].appendChild(item);
    heights[minIdx] += img.aspectRatio;
  });

  // Setup IntersectionObserver for lazy loading
  setupLazyLoad();
}

function setupLazyLoad() {
  if (observer) observer.disconnect();

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target.querySelector('img[data-src]');
        if (img) {
          img.src = img.getAttribute('data-src');
          img.removeAttribute('data-src');
        }
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' });

  document.querySelectorAll('.gallery-item').forEach(item => observer.observe(item));
}

// ============================================================
// LIGHTBOX
// ============================================================
const lightbox = document.getElementById('lightbox');
const lbImage = document.getElementById('lbImage');
const lbCaption = document.getElementById('lbCaption');
const lbCounter = document.getElementById('lbCounter');

function openLightbox(idx) {
  lightboxIdx = idx;
  updateLightbox();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  lightboxIdx = -1;
}

function updateLightbox() {
  const img = IMAGES[lightboxIdx];
  lbImage.src = img.src;
  lbImage.alt = img.title;
  lbCaption.textContent = img.title;
  lbCounter.textContent = `${lightboxIdx + 1} / ${IMAGES.length}`;
}

function lightboxNav(delta) {
  lightboxIdx = (lightboxIdx + delta + IMAGES.length) % IMAGES.length;
  updateLightbox();
}

document.getElementById('lbClose').addEventListener('click', closeLightbox);
document.getElementById('lbPrev').addEventListener('click', () => lightboxNav(-1));
document.getElementById('lbNext').addEventListener('click', () => lightboxNav(1));

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (lightboxIdx === -1) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lightboxNav(-1);
  if (e.key === 'ArrowRight') lightboxNav(1);
});

// ============================================================
// RESPONSIVE
// ============================================================
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(renderGallery, 200);
});

// Initial render
renderGallery();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Airbnb tests **visual-heavy components** — masonry layout is a classic
- Masonry: distribute to shortest column using height accumulator array
- **IntersectionObserver** for lazy loading with `rootMargin: 200px` for preloading
- Skeleton shimmer: `background-size: 200%` + `background-position` animation
- Image fade-in on load: `opacity: 0` → add `.loaded` class → `opacity: 1` transition
- Lightbox: `position: fixed; inset: 0` overlay with keyboard navigation
- `body.style.overflow = 'hidden'` prevents background scroll when lightbox is open
- Debounced resize handler to rebuild layout when column count changes

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS, CSS Layout |
| FE Coding 1 | Medium | DOM, Events |
| FE Coding 2 | Hard | Masonry Layout, Lazy Loading, Lightbox |
| Cross-functional | Medium | API Design, Performance |
| Culture | Medium | Airbnb Values |
