# Walmart — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Walmart Global Tech |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/walmart-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Rejection Reason:** System Design — didn't handle micro-frontends for store locator

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Shopping Cart with Promo Code Engine**
   - Add/remove items, quantity, promo codes, cart total with discount breakdown

### 💡 Interview-Ready Answer

```javascript
function ShoppingCart() {
  const [items, setItems] = useState([]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  
  const addItem = (product) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, item.maxQuantity || 10) }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };
  
  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, quantity: Math.min(quantity, item.maxQuantity || 10) } : item
      ));
    }
  };
  
  // Promo code engine
  const promoRules = {
    'FLAT100': { type: 'FLAT', value: 100, minCart: 500, description: '₹100 off on orders above ₹500' },
    'PERCENT20': { type: 'PERCENT', value: 20, maxDiscount: 200, minCart: 300, description: '20% off up to ₹200' },
    'BOGO': { type: 'BOGO', category: 'snacks', description: 'Buy 1 Get 1 Free on snacks' },
    'FIRST50': { type: 'PERCENT', value: 50, maxDiscount: 150, firstOrderOnly: true, description: '50% off first order' },
  };
  
  const applyPromo = () => {
    setPromoError('');
    const rule = promoRules[promoCode.toUpperCase()];
    
    if (!rule) {
      setPromoError('Invalid promo code');
      return;
    }
    
    const subtotal = calculateSubtotal();
    
    if (rule.minCart && subtotal < rule.minCart) {
      setPromoError(`Minimum cart value ₹${rule.minCart} required`);
      return;
    }
    
    setAppliedPromo({ code: promoCode.toUpperCase(), ...rule });
  };
  
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };
  
  const calculateDiscount = () => {
    if (!appliedPromo) return 0;
    
    const subtotal = calculateSubtotal();
    
    switch (appliedPromo.type) {
      case 'FLAT':
        return appliedPromo.value;
      case 'PERCENT': {
        const discount = subtotal * (appliedPromo.value / 100);
        return appliedPromo.maxDiscount ? Math.min(discount, appliedPromo.maxDiscount) : discount;
      }
      case 'BOGO': {
        // Find cheapest item in category → that's the free item
        const categoryItems = items.filter(item => item.category === appliedPromo.category);
        if (categoryItems.length < 2) return 0;
        const cheapest = Math.min(...categoryItems.map(i => i.price));
        return cheapest;
      }
      default: return 0;
    }
  };
  
  const subtotal = calculateSubtotal();
  const discount = calculateDiscount();
  const deliveryFee = subtotal >= 499 ? 0 : 40;
  const total = subtotal - discount + deliveryFee;
  
  return (
    <div className="cart" role="region" aria-label="Shopping cart">
      <h2>Cart ({items.reduce((s, i) => s + i.quantity, 0)} items)</h2>
      
      {items.length === 0 ? (
        <p className="empty-cart">Your cart is empty</p>
      ) : (
        <ul className="cart-items" role="list">
          {items.map(item => (
            <li key={item.id} className="cart-item" role="listitem">
              <img src={item.image} alt={item.name} width="60" height="60" />
              <div className="item-details">
                <h3>{item.name}</h3>
                <div className="item-price">₹{item.price}</div>
              </div>
              
              <div className="quantity-control" role="group" aria-label={`${item.name} quantity`}>
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  aria-label="Decrease quantity">−</button>
                <span aria-live="polite">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  aria-label="Increase quantity"
                  disabled={item.quantity >= (item.maxQuantity || 10)}>+</button>
              </div>
              
              <div className="item-total">₹{(item.price * item.quantity).toLocaleString('en-IN')}</div>
              
              <button onClick={() => updateQuantity(item.id, 0)} aria-label={`Remove ${item.name}`}>
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}
      
      {/* Promo Code */}
      <div className="promo-section">
        {appliedPromo ? (
          <div className="applied-promo" role="status">
            <span>✅ {appliedPromo.code}: {appliedPromo.description}</span>
            <button onClick={() => setAppliedPromo(null)} aria-label="Remove promo code">✕</button>
          </div>
        ) : (
          <div className="promo-input">
            <input
              type="text"
              value={promoCode}
              onChange={e => setPromoCode(e.target.value)}
              placeholder="Enter promo code"
              aria-label="Promo code"
              aria-describedby={promoError ? 'promo-error' : undefined}
            />
            <button onClick={applyPromo} disabled={!promoCode.trim()}>Apply</button>
          </div>
        )}
        {promoError && <span id="promo-error" className="error" role="alert">{promoError}</span>}
      </div>
      
      {/* Bill Summary */}
      <div className="bill-summary" role="table" aria-label="Order summary">
        <div className="bill-row"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
        {discount > 0 && (
          <div className="bill-row discount">
            <span>Discount ({appliedPromo?.code})</span>
            <span>-₹{discount.toLocaleString('en-IN')}</span>
          </div>
        )}
        <div className="bill-row">
          <span>Delivery</span>
          <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
        </div>
        {deliveryFee > 0 && subtotal < 499 && (
          <div className="free-delivery-hint">Add ₹{499 - subtotal} more for free delivery</div>
        )}
        <div className="bill-row total">
          <span>Total</span>
          <span aria-live="polite">₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>
      
      <button className="checkout-btn" disabled={items.length === 0}>
        Proceed to Checkout
      </button>
    </div>
  );
}
```

---

## 🎯 Key Takeaways
- Walmart FE = **e-commerce cart + promo code engine**
- **Promo code types**: FLAT discount, PERCENT (with cap), BOGO (cheapest free), first-order
- **BOGO logic**: find cheapest item in category → that's the free one
- **Free delivery threshold**: "Add ₹X more for free delivery" — common UX pattern
- **Max quantity per item**: prevent hoarding (e.g., max 10 of same product)
- **Indian format**: `toLocaleString('en-IN')` for comma placement (1,00,000)
- Walmart FE rejected on **micro-frontend architecture** — study module federation for store locator vs product listing as separate deployables
- Walmart GDT values **practical e-commerce skills** + accessibility

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Cart, Promo Engine, BOGO, a11y |
| JavaScript | Medium | EventEmitter, Prototypal, Closures |
| System Design | Hard | Micro-Frontends, Store Locator |
| HM | Medium | Behavioral |
