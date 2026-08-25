# Flipkart — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/flipkart-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Rejection Reason:** System Design — didn't handle server-driven UI for dynamic feature flags

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Flipkart-style Image Carousel with Zoom on Hover**
   - Thumbnails, arrow navigation, auto-play, pinch-zoom on mobile, hover-zoom on desktop

### 💡 Interview-Ready Answer

```javascript
function ProductImageCarousel({ images }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [autoPlay, setAutoPlay] = useState(true);
  const imageRef = useRef(null);
  
  // Auto-play with pause on interaction
  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;
    
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % images.length);
    }, 3000);
    
    return () => clearInterval(timer);
  }, [autoPlay, images.length]);
  
  const goTo = (index) => {
    setActiveIndex(index);
    setAutoPlay(false); // Pause auto-play on manual navigation
  };
  
  const goNext = () => goTo((activeIndex + 1) % images.length);
  const goPrev = () => goTo((activeIndex - 1 + images.length) % images.length);
  
  // Hover zoom (desktop)
  const handleMouseMove = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };
  
  // Keyboard navigation
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); goPrev(); break;
      case 'ArrowRight': e.preventDefault(); goNext(); break;
      case 'Escape': setIsZooming(false); break;
    }
  };
  
  // Touch swipe detection
  const touchStartX = useRef(0);
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goPrev() : goNext();
    }
  };
  
  return (
    <div
      className="product-carousel"
      role="region"
      aria-label="Product images"
      aria-roledescription="carousel"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Main Image */}
      <div className="main-image-container">
        <button className="nav-arrow prev" onClick={goPrev} aria-label="Previous image">‹</button>
        
        <div
          ref={imageRef}
          className="main-image"
          onMouseEnter={() => setIsZooming(true)}
          onMouseLeave={() => setIsZooming(false)}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={images[activeIndex].url}
            alt={images[activeIndex].alt || `Product image ${activeIndex + 1} of ${images.length}`}
            loading={activeIndex === 0 ? 'eager' : 'lazy'}
          />
          
          {/* Zoom indicator */}
          {!isZooming && (
            <div className="zoom-hint" aria-hidden="true">
              🔍 Hover to zoom
            </div>
          )}
        </div>
        
        <button className="nav-arrow next" onClick={goNext} aria-label="Next image">›</button>
        
        {/* Zoom lens (desktop) */}
        {isZooming && (
          <div
            className="zoom-view"
            style={{
              backgroundImage: `url(${images[activeIndex].highRes || images[activeIndex].url})`,
              backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
              backgroundSize: '200%', // 2x zoom
            }}
            role="img"
            aria-label="Zoomed view"
          />
        )}
      </div>
      
      {/* Thumbnails */}
      <div className="thumbnail-strip" role="tablist" aria-label="Product image thumbnails">
        {images.map((img, idx) => (
          <button
            key={idx}
            role="tab"
            aria-selected={idx === activeIndex}
            className={`thumbnail ${idx === activeIndex ? 'active' : ''}`}
            onClick={() => goTo(idx)}
            onMouseEnter={() => goTo(idx)} // Preview on hover (Flipkart behavior)
            aria-label={`View image ${idx + 1}`}
          >
            <img src={img.thumbnail || img.url} alt="" width="60" height="60" />
          </button>
        ))}
      </div>
      
      {/* Dots indicator */}
      <div className="dots" aria-hidden="true">
        {images.map((_, idx) => (
          <span key={idx} className={`dot ${idx === activeIndex ? 'active' : ''}`} />
        ))}
      </div>
      
      {/* Screen reader announcement */}
      <div aria-live="polite" className="sr-only">
        Image {activeIndex + 1} of {images.length}
      </div>
    </div>
  );
}

// CSS for zoom view (positioned to the right of main image):
/*
.main-image-container { display: flex; gap: 16px; position: relative; }
.zoom-view {
  width: 400px; height: 400px;
  border: 1px solid #ddd;
  background-repeat: no-repeat;
}
.main-image { cursor: crosshair; position: relative; }
*/
```

---

## Round 2: JavaScript
**Duration:** 45 minutes

### Questions Asked
1. **Implement getElementsByClassName (without using native API)**
2. **Explain Microtask vs Macrotask queue with examples**
3. **What is tree shaking and how does it work?**

### 💡 getElementsByClassName

```javascript
function getElementsByClassName(root, className) {
  const results = [];
  
  function traverse(node) {
    // Check if element node (nodeType 1)
    if (node.nodeType === 1) {
      // Check if has the target class
      const classes = (node.getAttribute('class') || '').split(/\s+/);
      if (classes.includes(className)) {
        results.push(node);
      }
    }
    
    // Recurse into children
    for (let i = 0; i < node.childNodes.length; i++) {
      traverse(node.childNodes[i]);
    }
  }
  
  traverse(root);
  return results;
}

// Iterative version (avoids stack overflow for very deep DOM):
function getElementsByClassNameIterative(root, className) {
  const results = [];
  const stack = [root];
  
  while (stack.length) {
    const node = stack.pop();
    
    if (node.nodeType === 1) {
      const classes = node.className.split(/\s+/);
      if (classes.includes(className)) results.push(node);
    }
    
    // Push children in reverse order so first child is processed first
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      stack.push(node.childNodes[i]);
    }
  }
  
  return results;
}

// Tree Shaking:
// - Dead code elimination based on ES module static structure
// - Only works with ES modules (import/export), NOT CommonJS (require)
// - Bundler (Webpack/Rollup) analyzes which exports are imported
// - Unused exports are marked as dead code → removed in minification
// - Requirements: ES modules, pure functions (no side effects)
// - sideEffects: false in package.json → tell bundler ALL files are pure
// - Pitfalls: barrel files (index.js re-exporting everything) can prevent tree shaking
```

---

## 🎯 Key Takeaways
- Flipkart FE = **e-commerce product page components** — carousel, zoom, comparison
- **Image Carousel** with hover-zoom: `backgroundPosition` tracks mouse position (percentage)
- **Thumbnail hover preview** (not just click) — that's the Flipkart UX pattern
- **Touch swipe**: simple `touchStartX - touchEndX > 50px` threshold
- **getElementsByClassName** with DOM traversal — check `nodeType === 1` for elements
- **Tree shaking**: ES modules only, `sideEffects: false`, avoid barrel files
- Flipkart rejected on **server-driven UI** — study how feature flags control layout/components dynamically from server
- Flipkart cares about **e-commerce specific UX** patterns and mobile performance

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Carousel, Hover Zoom, Touch Swipe |
| JavaScript | Medium | DOM Traversal, Microtasks, Tree Shaking |
| System Design | Hard | Product Page, Server-Driven UI, CDN |
| HM | Medium | Behavioral |
