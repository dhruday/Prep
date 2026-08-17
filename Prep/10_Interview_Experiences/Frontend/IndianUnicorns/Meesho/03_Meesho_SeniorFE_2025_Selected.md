# Meesho — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meesho |
| **Role** | SDE-3 Frontend |
| **Level** | Lead |
| **YOE** | 5.5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/meesho-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Timeline:** 10 days

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Product Listing Page with Infinite Scroll and Quick View**
   - Product grid (2 columns mobile, 4 desktop)
   - Infinite scroll loading via IntersectionObserver
   - Quick view modal on product click (no page navigation)
   - Add to cart from quick view
   - Skeleton loading state

### 💡 Interview-Ready Answer

```jsx
function ProductListing() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [quickView, setQuickView] = useState(null); // product or null
  const sentinelRef = useRef(null);
  
  // Fetch products
  const fetchProducts = useCallback(async (pageNum) => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/products?page=${pageNum}&limit=20`);
      const data = await res.json();
      
      setProducts(prev => {
        // Deduplicate: merge by ID
        const existing = new Set(prev.map(p => p.id));
        const newItems = data.products.filter(p => !existing.has(p.id));
        return [...prev, ...newItems];
      });
      
      setHasMore(data.hasMore);
      setPage(pageNum + 1);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);
  
  // Initial load
  useEffect(() => { fetchProducts(1); }, []);
  
  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          fetchProducts(page);
        }
      },
      { rootMargin: '200px' } // Start loading 200px before sentinel is visible
    );
    
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [page, hasMore, loading, fetchProducts]);
  
  // Skeleton loader
  const SkeletonCard = () => (
    <div className="product-card skeleton" aria-hidden="true">
      <div className="skeleton-image" />
      <div className="skeleton-line" style={{ width: '80%' }} />
      <div className="skeleton-line" style={{ width: '40%' }} />
      <div className="skeleton-line" style={{ width: '60%' }} />
    </div>
  );
  
  // Quick View Modal
  const QuickViewModal = ({ product, onClose }) => {
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedImage, setSelectedImage] = useState(0);
    const modalRef = useRef(null);
    
    // Focus trap
    useEffect(() => {
      const previousFocus = document.activeElement;
      modalRef.current?.focus();
      
      const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
        previousFocus?.focus();
      };
    }, [onClose]);
    
    return createPortal(
      <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
        <div ref={modalRef} className="quick-view-modal" role="dialog" aria-modal="true"
             aria-label={`Quick view: ${product.name}`} tabIndex={-1}>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
          
          <div className="qv-layout">
            {/* Image Gallery */}
            <div className="qv-images">
              <img src={product.images[selectedImage]} alt={product.name}
                   className="main-image" loading="eager" />
              <div className="thumbnail-strip">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`thumbnail ${i === selectedImage ? 'active' : ''}`}
                    aria-label={`View image ${i + 1}`}>
                    <img src={img} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
            
            {/* Product Info */}
            <div className="qv-info">
              <h2>{product.name}</h2>
              <div className="qv-price">
                <span className="current-price">₹{product.price.toLocaleString('en-IN')}</span>
                {product.originalPrice && (
                  <>
                    <span className="original-price">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                    <span className="discount">
                      {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>
              
              {/* Size Selection */}
              {product.sizes && (
                <fieldset className="size-selection">
                  <legend>Select Size</legend>
                  <div className="size-options">
                    {product.sizes.map(size => (
                      <label key={size.value}
                        className={`size-option ${selectedSize === size.value ? 'selected' : ''} ${!size.inStock ? 'out-of-stock' : ''}`}>
                        <input
                          type="radio"
                          name="size"
                          value={size.value}
                          checked={selectedSize === size.value}
                          onChange={() => setSelectedSize(size.value)}
                          disabled={!size.inStock}
                          className="visually-hidden"
                        />
                        {size.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              
              <button className="add-to-cart-btn"
                disabled={product.sizes && !selectedSize}
                onClick={() => {
                  addToCart(product.id, selectedSize);
                  onClose();
                }}>
                Add to Cart
              </button>
              
              <div className="qv-details">
                <p>{product.description}</p>
                <p className="delivery-info">🚚 Free delivery on orders above ₹299</p>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };
  
  return (
    <div className="product-listing">
      <div className="product-grid" role="list">
        {products.map(product => (
          <article key={product.id} className="product-card" role="listitem"
            onClick={() => setQuickView(product)}>
            <div className="product-image-container">
              <img src={product.images[0]} alt={product.name} loading="lazy"
                   decoding="async" width="300" height="400" />
              {product.discount && (
                <span className="discount-badge">{product.discount}% OFF</span>
              )}
            </div>
            <div className="product-info">
              <h3 className="product-name">{product.name}</h3>
              <div className="product-price">
                ₹{product.price.toLocaleString('en-IN')}
                {product.originalPrice && (
                  <span className="original">₹{product.originalPrice}</span>
                )}
              </div>
              <div className="product-rating">
                ⭐ {product.rating} ({product.reviewCount})
              </div>
              <p className="product-delivery">Free Delivery</p>
            </div>
          </article>
        ))}
        
        {/* Skeleton loading */}
        {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={`skeleton-${i}`} />)}
      </div>
      
      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} className="sentinel" aria-hidden="true" />}
      
      {!hasMore && products.length > 0 && (
        <p className="end-message" role="status">You've reached the end! 🎉</p>
      )}
      
      {/* Quick View Modal */}
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </div>
  );
}
```

**CSS for responsive grid:**
```css
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* Mobile: 2 columns */
  gap: 12px;
  padding: 12px;
}

@media (min-width: 768px) {
  .product-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 1024px) {
  .product-grid { grid-template-columns: repeat(4, 1fr); }
}

.skeleton-image {
  aspect-ratio: 3/4;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
```

---

## 🎯 Key Takeaways
- Meesho FE = **e-commerce product listing** + infinite scroll + quick view
- **IntersectionObserver** with `rootMargin: '200px'` for pre-fetching (starts loading before sentinel visible)
- **Deduplication**: filter by ID when appending new page results
- **Skeleton loading**: CSS `shimmer` animation with gradient + `background-size: 200%`
- **Quick view modal**: focus trap, escape to close, restore focus, body scroll lock
- **Image lazy loading**: `loading="lazy"` + `decoding="async"` + explicit dimensions
- **Responsive grid**: CSS Grid with media queries (2 → 3 → 4 columns)
- Meesho's **social commerce model**: resellers share products on WhatsApp → know this domain

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Infinite Scroll, Quick View, Skeleton, Grid |
| JavaScript | Medium | Promises, Closures, Prototype |
| System Design | Hard | Product Feed, Image Optimization |
| HM | Medium | Behavioral |
