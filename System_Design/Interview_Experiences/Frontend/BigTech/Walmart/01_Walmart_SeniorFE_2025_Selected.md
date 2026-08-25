# Walmart — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Walmart Global Tech |
| **Role** | SDE-3 Frontend |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/walmart-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + Machine Coding + 2 Technical + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

---

## Round 1: Online Assessment
**Duration:** 75 minutes

### Questions Asked
1. **Implement Promise.allSettled polyfill**
2. **CSS: Build a responsive product card grid** (auto-fill with min-max for variable screen sizes)
3. **Implement a custom EventEmitter with once() support**

### 💡 Promise.allSettled Polyfill

```javascript
Promise.myAllSettled = function(promises) {
  return new Promise((resolve) => {
    const results = [];
    let settled = 0;
    const promiseArr = [...promises];
    
    if (promiseArr.length === 0) {
      resolve([]);
      return;
    }
    
    promiseArr.forEach((promise, i) => {
      Promise.resolve(promise).then(
        (value) => {
          results[i] = { status: 'fulfilled', value };
        },
        (reason) => {
          results[i] = { status: 'rejected', reason };
        }
      ).finally(() => {
        settled++;
        if (settled === promiseArr.length) resolve(results);
      });
    });
  });
};
```

### 💡 EventEmitter with once()

```javascript
class EventEmitter {
  constructor() {
    this.events = new Map();
  }
  
  on(event, listener) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push({ fn: listener, once: false });
    return this; // Chainable
  }
  
  once(event, listener) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push({ fn: listener, once: true });
    return this;
  }
  
  emit(event, ...args) {
    const listeners = this.events.get(event);
    if (!listeners) return false;
    
    // Filter out 'once' listeners after invocation
    const remaining = [];
    for (const entry of listeners) {
      entry.fn(...args);
      if (!entry.once) remaining.push(entry);
    }
    
    if (remaining.length > 0) {
      this.events.set(event, remaining);
    } else {
      this.events.delete(event);
    }
    
    return true;
  }
  
  off(event, listener) {
    const listeners = this.events.get(event);
    if (!listeners) return this;
    
    const idx = listeners.findIndex(entry => entry.fn === listener);
    if (idx !== -1) listeners.splice(idx, 1);
    if (listeners.length === 0) this.events.delete(event);
    
    return this;
  }
  
  listenerCount(event) {
    return this.events.get(event)?.length || 0;
  }
  
  removeAllListeners(event) {
    if (event) this.events.delete(event);
    else this.events.clear();
    return this;
  }
}
```

---

## Round 2: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Shopping Cart with quantity management, price calculation, and promo codes** (React)

### 💡 Interview-Ready Answer

```javascript
import { createContext, useContext, useReducer, useCallback } from 'react';

// Cart Reducer
function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.id === action.item.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i => 
            i.id === action.item.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        };
      }
      return { ...state, items: [...state.items, { ...action.item, quantity: 1 }] };
    }
    
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.id) };
    
    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter(i => i.id !== action.id) };
      }
      return {
        ...state,
        items: state.items.map(i => 
          i.id === action.id ? { ...i, quantity: Math.min(action.quantity, 10) } : i
        )
      };
    }
    
    case 'APPLY_PROMO': {
      const promos = {
        'SAVE20': { type: 'percent', value: 20, minOrder: 500 },
        'FLAT200': { type: 'flat', value: 200, minOrder: 1000 },
        'BOGO': { type: 'bogo', category: 'groceries' },
      };
      const promo = promos[action.code.toUpperCase()];
      if (!promo) return { ...state, promoError: 'Invalid promo code' };
      return { ...state, promo, promoCode: action.code.toUpperCase(), promoError: null };
    }
    
    case 'REMOVE_PROMO':
      return { ...state, promo: null, promoCode: null, promoError: null };
    
    default:
      return state;
  }
}

// Context
const CartContext = createContext(null);

function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    promo: null,
    promoCode: null,
    promoError: null,
  });
  
  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

function useCart() {
  const { state, dispatch } = useContext(CartContext);
  
  const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  let discount = 0;
  if (state.promo) {
    if (state.promo.type === 'percent' && subtotal >= state.promo.minOrder) {
      discount = Math.round(subtotal * state.promo.value / 100);
    } else if (state.promo.type === 'flat' && subtotal >= state.promo.minOrder) {
      discount = state.promo.value;
    }
  }
  
  const total = Math.max(0, subtotal - discount);
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  
  return { ...state, subtotal, discount, total, itemCount, dispatch };
}

// Cart Component
function ShoppingCart() {
  const { items, subtotal, discount, total, promoCode, promoError, dispatch } = useCart();
  
  if (items.length === 0) {
    return (
      <div className="empty-cart" role="status">
        <p>Your cart is empty</p>
        <a href="/products">Continue Shopping</a>
      </div>
    );
  }
  
  return (
    <div className="shopping-cart" role="region" aria-label="Shopping Cart">
      <h2>Shopping Cart ({items.length} items)</h2>
      
      <ul className="cart-items" role="list">
        {items.map(item => (
          <CartItem key={item.id} item={item} />
        ))}
      </ul>
      
      <PromoCodeInput 
        currentCode={promoCode} 
        error={promoError} 
        onApply={(code) => dispatch({ type: 'APPLY_PROMO', code })}
        onRemove={() => dispatch({ type: 'REMOVE_PROMO' })}
      />
      
      <div className="cart-summary">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>₹{subtotal.toLocaleString('en-IN')}</span>
        </div>
        {discount > 0 && (
          <div className="summary-row discount">
            <span>Discount ({promoCode})</span>
            <span>-₹{discount.toLocaleString('en-IN')}</span>
          </div>
        )}
        <div className="summary-row total">
          <span>Total</span>
          <span>₹{total.toLocaleString('en-IN')}</span>
        </div>
        <button className="checkout-btn">Proceed to Checkout</button>
      </div>
    </div>
  );
}

function CartItem({ item }) {
  const { dispatch } = useContext(CartContext);
  
  return (
    <li className="cart-item">
      <img src={item.image} alt={item.name} width="80" height="80" loading="lazy" />
      <div className="item-details">
        <h3>{item.name}</h3>
        <p className="item-price">₹{item.price.toLocaleString('en-IN')}</p>
      </div>
      <div className="quantity-controls">
        <button onClick={() => dispatch({ type: 'UPDATE_QUANTITY', id: item.id, quantity: item.quantity - 1 })}
                aria-label={`Decrease ${item.name} quantity`}>−</button>
        <span aria-label={`Quantity: ${item.quantity}`}>{item.quantity}</span>
        <button onClick={() => dispatch({ type: 'UPDATE_QUANTITY', id: item.id, quantity: item.quantity + 1 })}
                aria-label={`Increase ${item.name} quantity`}>+</button>
      </div>
      <span className="line-total">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
      <button className="remove-btn" 
              onClick={() => dispatch({ type: 'REMOVE_ITEM', id: item.id })}
              aria-label={`Remove ${item.name} from cart`}>×</button>
    </li>
  );
}
```

---

## Round 3: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Walmart.com's Homepage for Black Friday traffic**
   - 100M+ users, personalized sections, deals countdown, performance

### 💡 Interview-Ready Answer

```
Black Friday Homepage Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Traffic: 100M+ concurrent users on Black Friday             │
│  Challenge: Must be fast AND personalized                    │
│                                                                │
│  SSR + Edge Caching Strategy:                                 │
│  1. Static shell: header + footer + layout → CDN cached      │
│  2. Personalized sections: client-side fetch (after hydration)│
│  3. Deal banners: edge-computed (CDN worker) by user segment │
│                                                                │
│  Page Load Sequence:                                          │
│  1st paint (< 500ms): SSR static shell + hero banner        │
│  Hydration (< 1.5s): React takes over, attaches events      │
│  Personalized (< 2.5s): "Recommended for you" loads client   │
│  Below-fold (lazy): categories, recent views loaded on scroll│
│                                                                │
│  Deals Countdown Timer:                                       │
│  - Server sends deal end time (absolute UTC timestamp)       │
│  - Client computes remaining time locally                    │
│  - Self-correcting: sync with server every 60 seconds        │
│  - requestAnimationFrame for smooth seconds countdown        │
│  - When timer hits 0 → fetch updated deal status             │
│                                                                │
│  Image Strategy (Black Friday = image-heavy):                │
│  - AVIF with WebP fallback via <picture>                     │
│  - Responsive: srcset 320w, 640w, 960w                      │
│  - Hero: preloaded in <head> as <link rel="preload">        │
│  - Below-fold: loading="lazy" + IntersectionObserver         │
│  - Placeholder: solid brand color (#0071dc for Walmart)      │
│                                                                │
│  Resilience (Black Friday traffic):                          │
│  - Circuit breaker: if API slow → show cached/generic content│
│  - Graceful degradation: personalization fails → show popular│
│  - Service Worker: cache critical assets (offline shell)      │
│  - A/B test infrastructure: feature flags for rollback       │
│  - Client-side rate limiting: don't spam API on scroll       │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Walmart SDE-3 FE = **deep React + performance at scale**
- **useReducer + Context** for cart is the canonical pattern — know the reducer well
- **Promise.allSettled** polyfill — remember: ALWAYS resolves, never rejects
- **EventEmitter** with `once()` — filter out listeners after invocation
- **Black Friday optimization** = edge caching, graceful degradation, circuit breakers
- **Self-correcting countdown timer** = common Walmart question (sync with server time)
- Walmart values **resilience engineering** — "what happens when things fail?" matters most

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Polyfills, CSS Grid, EventEmitter |
| Machine Coding | Medium-Hard | React Cart, Reducer, Promo Codes |
| System Design | Hard | E-Commerce, Black Friday Scale |
| HM | Medium | Behavioral |
