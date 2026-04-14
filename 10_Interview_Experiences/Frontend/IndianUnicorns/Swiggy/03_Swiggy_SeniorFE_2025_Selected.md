# Swiggy — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/swiggy-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Timeline:** 10 days

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Restaurant Menu Page with Scroll Spy and Cart**
   - Menu categories on left sidebar (click to scroll)
   - Active category highlights as user scrolls (scroll spy)
   - Add to cart with quantity selector
   - Veg/non-veg filter toggle
   - "Add more from same restaurant" suggestion

### 💡 Interview-Ready Answer

```jsx
function RestaurantMenuPage({ restaurant }) {
  const [cart, setCart] = useState({}); // { itemId: quantity }
  const [activeCategory, setActiveCategory] = useState(null);
  const [vegOnly, setVegOnly] = useState(false);
  const categoryRefs = useRef({});
  const observerRef = useRef(null);
  
  const filteredMenu = useMemo(() => {
    if (!vegOnly) return restaurant.menu;
    return restaurant.menu.map(category => ({
      ...category,
      items: category.items.filter(item => item.isVeg),
    })).filter(category => category.items.length > 0);
  }, [restaurant.menu, vegOnly]);
  
  // IntersectionObserver-based scroll spy
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '-20% 0px -70% 0px', // Trigger when section enters top 30% of viewport
      threshold: 0,
    };
    
    observerRef.current = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveCategory(entry.target.dataset.categoryId);
        }
      }
    }, options);
    
    // Observe all category sections
    Object.values(categoryRefs.current).forEach(ref => {
      if (ref) observerRef.current.observe(ref);
    });
    
    return () => observerRef.current?.disconnect();
  }, [filteredMenu]);
  
  const scrollToCategory = (categoryId) => {
    const element = categoryRefs.current[categoryId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  const addToCart = (itemId) => {
    setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };
  
  const updateQuantity = (itemId, delta) => {
    setCart(prev => {
      const newQty = (prev[itemId] || 0) + delta;
      if (newQty <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newQty };
    });
  };
  
  const cartItemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = restaurant.menu.flatMap(c => c.items).find(i => i.id === itemId);
    return sum + (item ? item.price * qty : 0);
  }, 0);
  
  return (
    <div className="restaurant-page">
      {/* Restaurant Header */}
      <header className="restaurant-header">
        <h1>{restaurant.name}</h1>
        <div className="meta">
          <span>⭐ {restaurant.rating}</span>
          <span>{restaurant.deliveryTime} min</span>
          <span>₹{restaurant.costForTwo} for two</span>
        </div>
      </header>
      
      {/* Veg Filter */}
      <div className="filter-bar">
        <label className="veg-toggle">
          <input
            type="checkbox"
            checked={vegOnly}
            onChange={e => setVegOnly(e.target.checked)}
            aria-label="Show vegetarian items only"
          />
          <span className="toggle-slider" />
          Veg Only
        </label>
      </div>
      
      <div className="menu-layout">
        {/* Left Sidebar: Category Navigation */}
        <nav className="category-nav" aria-label="Menu categories">
          <ul role="list">
            {filteredMenu.map(category => (
              <li key={category.id}>
                <button
                  className={`category-link ${activeCategory === category.id ? 'active' : ''}`}
                  onClick={() => scrollToCategory(category.id)}
                  aria-current={activeCategory === category.id ? 'true' : undefined}
                >
                  {category.name}
                  <span className="item-count">({category.items.length})</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Main Content: Menu Items */}
        <main className="menu-content" role="main">
          {filteredMenu.map(category => (
            <section
              key={category.id}
              ref={el => categoryRefs.current[category.id] = el}
              data-category-id={category.id}
              aria-labelledby={`category-${category.id}`}
            >
              <h2 id={`category-${category.id}`}>
                {category.name}
                <span className="count">({category.items.length})</span>
              </h2>
              
              {category.items.map(item => (
                <div key={item.id} className="menu-item">
                  <div className="item-info">
                    <div className={`veg-indicator ${item.isVeg ? 'veg' : 'non-veg'}`}
                         aria-label={item.isVeg ? 'Vegetarian' : 'Non-vegetarian'}>
                      <span />
                    </div>
                    <h3>{item.name}</h3>
                    <p className="price">₹{item.price}</p>
                    <p className="description">{item.description}</p>
                    {item.isBestseller && <span className="badge bestseller">★ Bestseller</span>}
                  </div>
                  
                  <div className="item-action">
                    {item.image && <img src={item.image} alt={item.name} loading="lazy" />}
                    
                    {cart[item.id] ? (
                      <div className="quantity-control" role="group"
                           aria-label={`${item.name} quantity`}>
                        <button onClick={() => updateQuantity(item.id, -1)} aria-label="Decrease">−</button>
                        <span aria-live="polite">{cart[item.id]}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} aria-label="Increase">+</button>
                      </div>
                    ) : (
                      <button className="add-btn" onClick={() => addToCart(item.id)}
                              aria-label={`Add ${item.name} to cart`}>
                        ADD
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </main>
      </div>
      
      {/* Sticky Cart Footer */}
      {cartItemCount > 0 && (
        <div className="cart-footer" role="status" aria-live="polite">
          <div className="cart-summary">
            <span>{cartItemCount} item{cartItemCount > 1 ? 's' : ''}</span>
            <span>₹{cartTotal.toLocaleString('en-IN')}</span>
          </div>
          <button className="view-cart-btn">View Cart →</button>
        </div>
      )}
    </div>
  );
}
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement Promise.race polyfill**
2. **Implement a retry function with exponential backoff**

### 💡 Promise.race + Retry with Backoff

```javascript
// Promise.race polyfill
Promise.myRace = function(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('Argument must be iterable'));
    }
    
    if (promises.length === 0) {
      return; // Never resolves (per spec)
    }
    
    for (const promise of promises) {
      Promise.resolve(promise).then(resolve, reject);
    }
  });
};

// Retry with exponential backoff
async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    jitter = true,
    retryOn = () => true, // Predicate: should retry on this error?
    onRetry = () => {},    // Callback before each retry
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      
      if (attempt >= maxRetries || !retryOn(error, attempt)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      let delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );
      
      // Add jitter to prevent thundering herd
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5); // 50-100% of calculated delay
      }
      
      onRetry({ attempt, delay, error });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Usage:
const data = await retry(
  () => fetch('/api/order-status').then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }),
  {
    maxRetries: 3,
    baseDelay: 1000,
    retryOn: (error) => {
      // Only retry on 5xx or network errors, not 4xx
      return !error.message.includes('HTTP 4');
    },
    onRetry: ({ attempt, delay }) => {
      console.log(`Retry ${attempt + 1} in ${delay}ms`);
    },
  }
);
```

---

## 🎯 Key Takeaways
- Swiggy FE = **restaurant menu + scroll spy** is the signature question
- **IntersectionObserver** for scroll spy: rootMargin `-20% 0px -70% 0px` targets top 30% of viewport
- **Veg/non-veg filter**: green/red dot indicator — Indian food delivery essential UX
- **Sticky cart footer**: item count + total, appears when cart is non-empty
- **Promise.race**: first settled promise wins — empty array never resolves (per spec)
- **Retry with exponential backoff**: jitter prevents thundering herd, retryOn predicate for selective retry
- Know **Swiggy's architecture**: BFF pattern, Swiggy One membership, dark stores (Instamart)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Scroll Spy, IntersectionObserver, Cart |
| JavaScript | Medium | Promise.race, Retry, Backoff |
| System Design | Hard | Real-Time Order Tracking, WebSocket |
| HM | Medium | Behavioral |
