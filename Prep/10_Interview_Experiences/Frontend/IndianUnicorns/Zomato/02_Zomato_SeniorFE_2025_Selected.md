# Zomato — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Zomato |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Gurugram, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/zomato-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 3 (Machine Coding + Technical + System Design)
- **Timeline:** 1 week

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Restaurant Menu Page with Real-Time Order Tracker**
   - Menu with categories (scroll-spy), cart, order status with animated progress

### 💡 Interview-Ready Answer

```javascript
function RestaurantPage() {
  const [cart, setCart] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const categoryRefs = useRef({});
  
  const menu = {
    'Recommended': [
      { id: 1, name: 'Butter Chicken', price: 350, veg: false, rating: 4.5 },
      { id: 2, name: 'Paneer Tikka', price: 280, veg: true, rating: 4.2 },
    ],
    'Starters': [
      { id: 3, name: 'Samosa', price: 60, veg: true, rating: 4.0 },
      { id: 4, name: 'Chicken Wings', price: 220, veg: false, rating: 4.3 },
    ],
    'Main Course': [
      { id: 5, name: 'Dal Makhani', price: 250, veg: true, rating: 4.6 },
      { id: 6, name: 'Biryani', price: 320, veg: false, rating: 4.8 },
    ],
    'Breads': [
      { id: 7, name: 'Butter Naan', price: 50, veg: true, rating: 4.1 },
    ],
  };
  
  // Scroll-spy: detect which category is in viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.dataset.category);
          }
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    );
    
    Object.values(categoryRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });
    
    return () => observer.disconnect();
  }, []);
  
  const addToCart = (item) => {
    setCart(prev => ({
      ...prev,
      [item.id]: {
        ...item,
        quantity: (prev[item.id]?.quantity || 0) + 1
      }
    }));
  };
  
  const removeFromCart = (itemId) => {
    setCart(prev => {
      const updated = { ...prev };
      if (updated[itemId]?.quantity > 1) {
        updated[itemId] = { ...updated[itemId], quantity: updated[itemId].quantity - 1 };
      } else {
        delete updated[itemId];
      }
      return updated;
    });
  };
  
  const scrollToCategory = (category) => {
    categoryRefs.current[category]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  const cartItems = Object.values(cart);
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  return (
    <div className="restaurant-page">
      {/* Category Navigation (sticky) */}
      <nav className="category-nav" role="tablist" aria-label="Menu categories">
        {Object.keys(menu).map(cat => (
          <button
            key={cat}
            role="tab"
            aria-selected={activeCategory === cat}
            className={`cat-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => scrollToCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </nav>
      
      {/* Menu Items */}
      <main className="menu-content" aria-label="Restaurant menu">
        {Object.entries(menu).map(([category, items]) => (
          <section
            key={category}
            ref={el => categoryRefs.current[category] = el}
            data-category={category}
          >
            <h2>{category}</h2>
            {items.map(item => (
              <div key={item.id} className="menu-item">
                <div className="item-info">
                  <span className={`veg-badge ${item.veg ? 'veg' : 'non-veg'}`}>
                    {item.veg ? '🟢' : '🔴'}
                  </span>
                  <h3>{item.name}</h3>
                  <div className="item-rating">⭐ {item.rating}</div>
                  <div className="item-price">₹{item.price}</div>
                </div>
                
                {cart[item.id] ? (
                  <div className="quantity-control" role="group" aria-label={`${item.name} quantity`}>
                    <button onClick={() => removeFromCart(item.id)} aria-label="Decrease">−</button>
                    <span aria-live="polite">{cart[item.id].quantity}</span>
                    <button onClick={() => addToCart(item)} aria-label="Increase">+</button>
                  </div>
                ) : (
                  <button className="add-btn" onClick={() => addToCart(item)}>
                    ADD
                  </button>
                )}
              </div>
            ))}
          </section>
        ))}
      </main>
      
      {/* Cart Footer */}
      {cartItems.length > 0 && (
        <footer className="cart-footer" role="status">
          <div className="cart-summary">
            {cartItems.length} item{cartItems.length > 1 ? 's' : ''} | ₹{total}
          </div>
          <button className="checkout-btn" onClick={() => placeOrder(cart)}>
            View Cart →
          </button>
        </footer>
      )}
      
      {/* Order Tracker Overlay */}
      {orderStatus && <OrderTracker status={orderStatus} />}
    </div>
  );
}

function OrderTracker({ status }) {
  const stages = ['Order Placed', 'Preparing', 'On the way', 'Delivered'];
  const currentIdx = stages.indexOf(status.stage);
  
  return (
    <div className="order-tracker" role="status" aria-label="Order tracking">
      <h3>Order #{status.orderId}</h3>
      
      <div className="progress-steps">
        {stages.map((stage, idx) => (
          <div key={stage} className={`step ${idx <= currentIdx ? 'complete' : ''} 
                                       ${idx === currentIdx ? 'current' : ''}`}>
            <div className="step-dot" aria-hidden="true">
              {idx < currentIdx ? '✓' : idx === currentIdx ? '●' : '○'}
            </div>
            <span className="step-label">{stage}</span>
            {idx < stages.length - 1 && (
              <div className={`step-line ${idx < currentIdx ? 'filled' : ''}`} />
            )}
          </div>
        ))}
      </div>
      
      <div className="eta" aria-live="polite">
        ETA: {status.etaMinutes} minutes
      </div>
      
      {status.stage === 'On the way' && (
        <div className="delivery-partner">
          <img src={status.rider.avatar} alt="" width="40" height="40" />
          <span>{status.rider.name}</span>
          <a href={`tel:${status.rider.phone}`} aria-label="Call delivery partner">📞</a>
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
1. **Implement Array.prototype.reduce from scratch**
2. **Explain Closure with 3 practical use cases**
3. **Output prediction: async/await + Promise chain**

### 💡 Array.prototype.reduce Polyfill

```javascript
Array.prototype.myReduce = function(callback, initialValue) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }
  
  const arr = this;
  const len = arr.length;
  
  if (len === 0 && initialValue === undefined) {
    throw new TypeError('Reduce of empty array with no initial value');
  }
  
  let accumulator;
  let startIndex;
  
  if (initialValue !== undefined) {
    accumulator = initialValue;
    startIndex = 0;
  } else {
    // Find first non-empty slot (sparse array handling)
    let found = false;
    for (let i = 0; i < len; i++) {
      if (i in arr) { // Check for sparse array holes
        accumulator = arr[i];
        startIndex = i + 1;
        found = true;
        break;
      }
    }
    if (!found) throw new TypeError('Reduce of empty array with no initial value');
  }
  
  for (let i = startIndex; i < len; i++) {
    if (i in arr) { // Skip sparse array holes
      accumulator = callback(accumulator, arr[i], i, arr);
    }
  }
  
  return accumulator;
};

// Closure use cases:
// 1. Data privacy / encapsulation
function createCounter() {
  let count = 0; // Private — can't access from outside
  return { increment: () => ++count, getCount: () => count };
}

// 2. Function factory
function multiply(factor) {
  return (num) => num * factor; // factor is closed over
}
const double = multiply(2);

// 3. Memoization
function memoize(fn) {
  const cache = new Map(); // Closed over
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}
```

---

## 🎯 Key Takeaways
- Zomato FE = **food ordering UI + scroll-spy + order tracking animation**
- **Scroll-spy** with IntersectionObserver (rootMargin offset for sticky header) — Zomato classic
- **Veg/non-veg badges** (🟢/🔴) — Indian food apps must have this
- **reduce polyfill** — handle edge cases: no initial value, sparse arrays (`i in arr`)
- **Closure use cases**: data privacy, function factory, memoization — know all three
- Order tracking with **step progress bar** — common UI pattern for food delivery
- Zomato values **practical UI skills** over algorithmic complexity

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Scroll-Spy, Cart, Order Tracker |
| JavaScript | Medium | reduce Polyfill, Closures, Async |
| System Design | Hard | Discovery Page, Search, CDN |
