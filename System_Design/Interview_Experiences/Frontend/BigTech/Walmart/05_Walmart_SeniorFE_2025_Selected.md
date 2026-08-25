# Walmart — Senior Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Walmart Global Tech |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/walmart-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + Machine Coding + Technical 1 + Technical 2 + HM)

---

## Round 2: Machine Coding
**Duration:** 90 minutes

### Challenge: Build a Grocery Cart with Weight-Based Pricing + Substitution Suggestions

```javascript
/**
 * Grocery Cart with Weight-Based Pricing:
 * - Products with per-kg / per-unit pricing
 * - Quantity stepper (0.25 kg increments for weight items)
 * - Substitution suggestions when item out of stock
 * - Cart total with savings calculation
 * - Delivery slot picker
 */
class GroceryCart {
  constructor(container) {
    this.container = container;
    this.cart = new Map(); // productId → { product, quantity }
    this.products = [];
    this.substitutionMap = {}; // productId → [substitute productIds]
    
    this.render();
  }
  
  setProducts(products, substitutionMap = {}) {
    this.products = products;
    this.substitutionMap = substitutionMap;
    this.render();
  }
  
  addToCart(productId, quantity = null) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;
    
    if (!product.inStock) {
      // Show substitution suggestions
      this.showSubstitutions(productId);
      return;
    }
    
    const existing = this.cart.get(productId);
    const defaultQty = product.pricingType === 'weight' ? 0.5 : 1; // 500g or 1 unit
    
    if (existing) {
      const increment = product.pricingType === 'weight' ? 0.25 : 1;
      existing.quantity = quantity ?? existing.quantity + increment;
      if (existing.quantity <= 0) {
        this.cart.delete(productId);
      }
    } else {
      this.cart.set(productId, { product, quantity: quantity ?? defaultQty });
    }
    
    this.render();
  }
  
  removeFromCart(productId) {
    this.cart.delete(productId);
    this.render();
  }
  
  updateQuantity(productId, delta) {
    const item = this.cart.get(productId);
    if (!item) return;
    
    const increment = item.product.pricingType === 'weight' ? 0.25 : 1;
    item.quantity = Math.max(0, item.quantity + delta * increment);
    
    if (item.quantity <= 0) {
      this.cart.delete(productId);
    }
    
    this.render();
  }
  
  get cartItems() {
    return Array.from(this.cart.values());
  }
  
  get subtotal() {
    return this.cartItems.reduce((sum, { product, quantity }) => {
      return sum + product.price * quantity;
    }, 0);
  }
  
  get savings() {
    return this.cartItems.reduce((sum, { product, quantity }) => {
      const original = product.originalPrice || product.price;
      return sum + (original - product.price) * quantity;
    }, 0);
  }
  
  get deliveryFee() {
    return this.subtotal >= 500 ? 0 : 30; // Free delivery over ₹500
  }
  
  showSubstitutions(productId) {
    const subIds = this.substitutionMap[productId] || [];
    const subs = subIds
      .map(id => this.products.find(p => p.id === id))
      .filter(p => p?.inStock);
    
    if (subs.length === 0) {
      this.notification = 'Sorry, no substitutions available for this item.';
    } else {
      this.pendingSubstitutions = { original: productId, alternatives: subs };
    }
    this.render();
  }
  
  formatWeight(kg) {
    if (kg < 1) return `${Math.round(kg * 1000)}g`;
    return `${kg}kg`;
  }
  
  render() {
    const items = this.cartItems;
    
    this.container.innerHTML = `
      <div class="grocery-cart" style="font-family:-apple-system,sans-serif; display:grid; grid-template-columns:1fr 350px; gap:16px; padding:16px">
        
        <!-- Product List -->
        <div>
          <h2 style="margin:0 0 16px">Grocery Store</h2>
          
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:12px">
            ${this.products.map(p => {
              const cartItem = this.cart.get(p.id);
              return `
                <div class="product-card" style="border:1px solid #e5e7eb; border-radius:12px; padding:12px; 
                     ${!p.inStock ? 'opacity:0.6' : ''} position:relative">
                  ${!p.inStock ? '<span style="position:absolute; top:8px; right:8px; background:#ef4444; color:#fff; font-size:10px; padding:2px 6px; border-radius:4px">Out of Stock</span>' : ''}
                  
                  <div style="font-size:32px; text-align:center; margin:8px 0">${p.emoji || '🥬'}</div>
                  <h4 style="margin:4px 0; font-size:14px">${this.sanitize(p.name)}</h4>
                  <div style="display:flex; align-items:baseline; gap:4px">
                    <span style="font-weight:bold; color:#22c55e">₹${p.price}${p.pricingType === 'weight' ? '/kg' : ''}</span>
                    ${p.originalPrice ? `<span style="text-decoration:line-through; color:#999; font-size:12px">₹${p.originalPrice}</span>` : ''}
                  </div>
                  
                  ${cartItem ? `
                    <div style="display:flex; align-items:center; gap:8px; margin-top:8px">
                      <button class="qty-btn" data-id="${p.id}" data-delta="-1"
                              style="width:28px; height:28px; border:1px solid #e5e7eb; border-radius:6px; background:#fff; cursor:pointer; font-size:16px">−</button>
                      <span style="min-width:40px; text-align:center; font-weight:500">
                        ${p.pricingType === 'weight' ? this.formatWeight(cartItem.quantity) : cartItem.quantity}
                      </span>
                      <button class="qty-btn" data-id="${p.id}" data-delta="1"
                              style="width:28px; height:28px; border:1px solid #22c55e; border-radius:6px; background:#22c55e; color:#fff; cursor:pointer; font-size:16px">+</button>
                    </div>
                  ` : `
                    <button class="add-btn" data-id="${p.id}"
                            style="width:100%; margin-top:8px; padding:6px; background:#22c55e; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:13px">
                      ${p.inStock ? 'Add' : 'Find Similar'}
                    </button>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <!-- Cart Sidebar -->
        <div style="border:1px solid #e5e7eb; border-radius:12px; padding:16px; height:fit-content; position:sticky; top:16px">
          <h3 style="margin:0 0 12px">Your Cart (${items.length} items)</h3>
          
          ${items.length === 0 ? '<p style="color:#999; text-align:center; padding:24px">Cart is empty</p>' : ''}
          
          ${items.map(({ product: p, quantity }) => `
            <div style="display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid #f0f0f0">
              <span style="font-size:20px">${p.emoji || '🥬'}</span>
              <div style="flex:1">
                <div style="font-size:13px; font-weight:500">${this.sanitize(p.name)}</div>
                <div style="font-size:11px; color:#666">
                  ${p.pricingType === 'weight' ? this.formatWeight(quantity) : `×${quantity}`}
                  · ₹${(p.price * quantity).toFixed(2)}
                </div>
              </div>
              <button class="remove-btn" data-id="${p.id}" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:16px">×</button>
            </div>
          `).join('')}
          
          ${items.length > 0 ? `
            <div style="margin-top:12px; padding-top:12px; border-top:2px solid #e5e7eb">
              <div style="display:flex; justify-content:space-between; margin:4px 0; font-size:13px">
                <span>Subtotal</span><span>₹${this.subtotal.toFixed(2)}</span>
              </div>
              ${this.savings > 0 ? `
                <div style="display:flex; justify-content:space-between; margin:4px 0; font-size:13px; color:#22c55e">
                  <span>You Save</span><span>−₹${this.savings.toFixed(2)}</span>
                </div>
              ` : ''}
              <div style="display:flex; justify-content:space-between; margin:4px 0; font-size:13px">
                <span>Delivery</span>
                <span>${this.deliveryFee === 0 ? '<span style="color:#22c55e">FREE</span>' : `₹${this.deliveryFee}`}</span>
              </div>
              ${this.subtotal < 500 ? `<p style="font-size:11px; color:#eab308">Add ₹${(500 - this.subtotal).toFixed(0)} more for free delivery</p>` : ''}
              <div style="display:flex; justify-content:space-between; margin:8px 0 0; font-size:16px; font-weight:bold">
                <span>Total</span><span>₹${(this.subtotal + this.deliveryFee).toFixed(2)}</span>
              </div>
              <button style="width:100%; margin-top:12px; padding:12px; background:#22c55e; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:15px; font-weight:600">
                Proceed to Checkout
              </button>
            </div>
          ` : ''}
        </div>
        
        <!-- Substitution Modal -->
        ${this.pendingSubstitutions ? this.renderSubstitutionModal() : ''}
      </div>
    `;
    
    this.attachListeners();
  }
  
  renderSubstitutionModal() {
    const original = this.products.find(p => p.id === this.pendingSubstitutions.original);
    const alts = this.pendingSubstitutions.alternatives;
    
    return `
      <div class="modal-overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:100">
        <div style="background:#fff; border-radius:12px; padding:24px; max-width:400px; width:90%">
          <h3 style="margin:0 0 8px">Out of Stock</h3>
          <p style="color:#666; margin:0 0 16px">${this.sanitize(original?.name)} is unavailable. Try these instead:</p>
          
          ${alts.map(p => `
            <div style="display:flex; align-items:center; gap:12px; padding:8px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px; cursor:pointer" class="sub-option" data-id="${p.id}">
              <span style="font-size:24px">${p.emoji || '🥬'}</span>
              <div style="flex:1">
                <div style="font-weight:500">${this.sanitize(p.name)}</div>
                <div style="font-size:12px; color:#22c55e">₹${p.price}${p.pricingType === 'weight' ? '/kg' : ''}</div>
              </div>
              <button class="sub-add" data-id="${p.id}" style="padding:6px 12px; background:#22c55e; color:#fff; border:none; border-radius:6px; cursor:pointer">Add</button>
            </div>
          `).join('')}
          
          <button class="modal-close" style="width:100%; margin-top:8px; padding:8px; background:none; border:1px solid #e5e7eb; border-radius:8px; cursor:pointer; color:#666">
            No thanks
          </button>
        </div>
      </div>
    `;
  }
  
  attachListeners() {
    this.container.querySelectorAll('.add-btn').forEach(btn => {
      btn.addEventListener('click', () => this.addToCart(btn.dataset.id));
    });
    
    this.container.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.updateQuantity(btn.dataset.id, parseInt(btn.dataset.delta, 10));
      });
    });
    
    this.container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => this.removeFromCart(btn.dataset.id));
    });
    
    this.container.querySelectorAll('.sub-add').forEach(btn => {
      btn.addEventListener('click', () => {
        this.pendingSubstitutions = null;
        this.addToCart(btn.dataset.id);
      });
    });
    
    this.container.querySelector('.modal-close')?.addEventListener('click', () => {
      this.pendingSubstitutions = null;
      this.render();
    });
  }
  
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- Walmart FE = **Grocery cart with weight-based pricing, substitution suggestions, free delivery threshold**
- **Weight-based pricing**: 0.25kg increments, display `< 1kg ? g : kg`, price = `pricePerKg × kg`
- **Substitution flow**: out-of-stock click → modal with alternatives from `substitutionMap[productId]`
- **Cart savings**: `(originalPrice - price) × quantity` — show savings prominently
- **Free delivery threshold**: `subtotal >= 500 ? 0 : 30` — nudge: "Add ₹X more for free delivery"
- **Sticky cart sidebar**: `position:sticky; top:16px` — always visible during scroll
- Walmart = **e-commerce + grocery** — price sensitivity, substitutions, delivery logistics

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Medium-Hard | Grocery Cart, Substitution |
| Technical 1 | Hard | JS, React, State Mgmt |
| Technical 2 | Hard | System Design |
| HM | Medium | Culture Fit |
