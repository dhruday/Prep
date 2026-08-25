# Swiggy — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/swiggy-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 Technical + Hiring Manager)
- **Timeline:** 10 days
- **Format:** Virtual

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Restaurant Menu Page with Cart functionality** (Vanilla JS only — no React)
   - Category-wise menu, add/remove items, quantity management, total price, apply coupon

### 💡 Interview-Ready Answer

```javascript
class MenuApp {
  constructor(rootEl) {
    this.root = rootEl;
    this.menu = [];
    this.cart = new Map(); // itemId → { item, quantity }
    this.coupon = null;
    this.init();
  }
  
  async init() {
    this.menu = await this.fetchMenu();
    this.render();
  }
  
  async fetchMenu() {
    // Mock API
    return [
      { id: '1', name: 'Paneer Butter Masala', price: 249, category: 'Main Course', veg: true },
      { id: '2', name: 'Chicken Biryani', price: 299, category: 'Main Course', veg: false },
      { id: '3', name: 'Gulab Jamun', price: 99, category: 'Desserts', veg: true },
      { id: '4', name: 'Masala Dosa', price: 149, category: 'Starters', veg: true },
    ];
  }
  
  addToCart(itemId) {
    const item = this.menu.find(i => i.id === itemId);
    if (!item) return;
    
    const existing = this.cart.get(itemId);
    if (existing) {
      existing.quantity++;
    } else {
      this.cart.set(itemId, { item, quantity: 1 });
    }
    this.renderCart();
  }
  
  removeFromCart(itemId) {
    const existing = this.cart.get(itemId);
    if (!existing) return;
    
    if (existing.quantity > 1) {
      existing.quantity--;
    } else {
      this.cart.delete(itemId);
    }
    this.renderCart();
  }
  
  applyCoupon(code) {
    const coupons = {
      'SWIGGY50': { type: 'percent', value: 50, maxDiscount: 100 },
      'FLAT100':  { type: 'flat', value: 100 },
    };
    
    const coupon = coupons[code.toUpperCase()];
    if (!coupon) {
      this.showToast('Invalid coupon code');
      return;
    }
    this.coupon = coupon;
    this.renderCart();
  }
  
  getSubtotal() {
    let total = 0;
    this.cart.forEach(({ item, quantity }) => total += item.price * quantity);
    return total;
  }
  
  getDiscount() {
    if (!this.coupon) return 0;
    const subtotal = this.getSubtotal();
    
    if (this.coupon.type === 'percent') {
      return Math.min(subtotal * this.coupon.value / 100, this.coupon.maxDiscount || Infinity);
    }
    return Math.min(this.coupon.value, subtotal);
  }
  
  // Group menu items by category
  getMenuByCategory() {
    return this.menu.reduce((acc, item) => {
      (acc[item.category] = acc[item.category] || []).push(item);
      return acc;
    }, {});
  }
  
  render() {
    const menuByCategory = this.getMenuByCategory();
    
    this.root.innerHTML = `
      <div class="app">
        <div class="menu-section">
          <h2>Menu</h2>
          ${Object.entries(menuByCategory).map(([cat, items]) => `
            <div class="category">
              <h3>${cat}</h3>
              ${items.map(item => `
                <div class="menu-item" data-id="${item.id}">
                  <span class="veg-indicator ${item.veg ? 'veg' : 'non-veg'}"></span>
                  <span class="item-name">${item.name}</span>
                  <span class="item-price">₹${item.price}</span>
                  <button class="add-btn" data-id="${item.id}" aria-label="Add ${item.name} to cart">
                    ADD
                  </button>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
        <div class="cart-section" id="cart-container">
          ${this.renderCartHTML()}
        </div>
      </div>
    `;
    
    this.attachEvents();
  }
  
  renderCartHTML() {
    if (this.cart.size === 0) {
      return '<div class="empty-cart"><p>Your cart is empty</p></div>';
    }
    
    const subtotal = this.getSubtotal();
    const discount = this.getDiscount();
    const total = subtotal - discount;
    
    return `
      <h2>Cart (${this.getTotalItems()} items)</h2>
      ${Array.from(this.cart.values()).map(({ item, quantity }) => `
        <div class="cart-item">
          <span>${item.name}</span>
          <div class="qty-controls">
            <button class="qty-btn minus" data-id="${item.id}">−</button>
            <span class="qty">${quantity}</span>
            <button class="qty-btn plus" data-id="${item.id}">+</button>
          </div>
          <span>₹${item.price * quantity}</span>
        </div>
      `).join('')}
      <div class="coupon-section">
        <input type="text" id="coupon-input" placeholder="Enter coupon code" />
        <button id="apply-coupon">APPLY</button>
      </div>
      ${this.coupon ? `<div class="discount">Discount: -₹${discount}</div>` : ''}
      <div class="subtotal">Subtotal: ₹${subtotal}</div>
      <div class="total">Total: ₹${total}</div>
      <button class="checkout-btn">Proceed to Checkout</button>
    `;
  }
  
  getTotalItems() {
    let count = 0;
    this.cart.forEach(({ quantity }) => count += quantity);
    return count;
  }
  
  renderCart() {
    const container = this.root.querySelector('#cart-container');
    if (container) {
      container.innerHTML = this.renderCartHTML();
      this.attachCartEvents();
    }
  }
  
  attachEvents() {
    // Event delegation on root
    this.root.addEventListener('click', (e) => {
      const addBtn = e.target.closest('.add-btn');
      if (addBtn) this.addToCart(addBtn.dataset.id);
    });
    this.attachCartEvents();
  }
  
  attachCartEvents() {
    this.root.querySelectorAll('.qty-btn.plus').forEach(btn => 
      btn.addEventListener('click', () => this.addToCart(btn.dataset.id))
    );
    this.root.querySelectorAll('.qty-btn.minus').forEach(btn =>
      btn.addEventListener('click', () => this.removeFromCart(btn.dataset.id))
    );
    
    const couponBtn = this.root.querySelector('#apply-coupon');
    if (couponBtn) {
      couponBtn.addEventListener('click', () => {
        const input = this.root.querySelector('#coupon-input');
        if (input.value.trim()) this.applyCoupon(input.value.trim());
      });
    }
  }
  
  showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

// Initialize
const app = new MenuApp(document.getElementById('root'));
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement Promise.any polyfill**
2. **useLocalStorage custom hook with cross-tab sync**

### 💡 Promise.any Polyfill

```javascript
Promise.myAny = function(promises) {
  return new Promise((resolve, reject) => {
    const errors = [];
    let rejected = 0;
    const promiseArr = [...promises];
    
    if (promiseArr.length === 0) {
      reject(new AggregateError([], 'All promises were rejected'));
      return;
    }
    
    promiseArr.forEach((promise, i) => {
      Promise.resolve(promise).then(
        (value) => resolve(value), // First to resolve wins
        (error) => {
          errors[i] = error;
          rejected++;
          if (rejected === promiseArr.length) {
            reject(new AggregateError(errors, 'All promises were rejected'));
          }
        }
      );
    });
  });
};
```

### 💡 useLocalStorage with Cross-Tab Sync

```javascript
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  
  const setValue = useCallback((value) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    window.localStorage.setItem(key, JSON.stringify(valueToStore));
  }, [key, storedValue]);
  
  // Cross-tab sync via storage event
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key !== key || e.storageArea !== localStorage) return;
      
      try {
        const newValue = e.newValue !== null ? JSON.parse(e.newValue) : initialValue;
        setStoredValue(newValue);
      } catch {
        setStoredValue(initialValue);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);
  
  return [storedValue, setValue];
}
```

---

## Round 3: Frontend System Design
**Duration:** 45 minutes

### Questions Asked
1. **Design Swiggy's Search & Discovery Page**
   - Restaurant search, cuisine filters, sort by delivery time/rating/cost, infinite scroll

### 💡 Interview-Ready Answer

```
Search & Discovery Architecture:
┌──────────────────────────────────────────────────────────────┐
│  URL as Single Source of Truth:                               │
│  /search?q=biryani&cuisine=north-indian&sort=rating&page=2  │
│  - Every filter/search → update URL params                   │
│  - Page load → read from URL → fetch data                   │
│  - Shareable: user can copy/paste URL with filters           │
│  - Back button works: browser history tracks state           │
│                                                                │
│  Search Flow:                                                 │
│  1. Debounced input (300ms)                                  │
│  2. AbortController: cancel previous in-flight request       │
│  3. Show recent searches from localStorage                   │
│  4. API: GET /api/search?q=...&lat=...&lng=...                │
│     Response: { restaurants: [...], filters: [...], total }  │
│  5. Render results + available filter options                │
│                                                                │
│  Infinite Scroll:                                             │
│  - IntersectionObserver on sentinel element at bottom         │
│  - Load 20 restaurants per page                              │
│  - Append to existing list (don't re-render entire list)     │
│  - Show skeleton loaders while fetching                      │
│  - Stop when all results loaded (total === loaded)           │
│                                                                │
│  Image Optimization:                                          │
│  - LQIP: 20x20 blurred placeholder → load full image lazy   │
│  - srcset for different DPR screens                          │
│  - Intersection Observer for lazy loading images             │
│  - WebP format with JPEG fallback                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Swiggy machine coding = **Vanilla JS** (no frameworks) — practice DOM manipulation
- **Cart with coupon system** is a common Swiggy question — handle edge cases (empty cart, max discount cap)
- **Event delegation** on root element is more efficient than per-button listeners
- **useLocalStorage** with `storage` event listener for cross-tab sync — commonly asked
- **Promise.any** polyfill — remember AggregateError for when all reject
- **URL-driven filter state** is the right pattern for search/discovery pages

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Vanilla JS, DOM, Cart Logic |
| JS Deep Dive | Medium | Polyfills, Custom Hooks |
| System Design | Medium-Hard | Search, Infinite Scroll, Optimization |
| HM | Medium | Behavioral |
