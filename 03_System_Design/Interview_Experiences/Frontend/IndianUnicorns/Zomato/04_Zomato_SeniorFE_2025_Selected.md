# Zomato — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Zomato |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Gurgaon, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/zomato-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge
**Build a Restaurant Menu with Cart Sidebar + Customization Modal**
- Menu categories with scroll-spy active highlighting
- Add to cart with quantity +/- controls
- Customization modal: size (S/M/L), toppings (multi-select), special instructions
- Cart sidebar: items with customizations, subtotal, delivery fee, taxes
- Promo code input with validation
- Responsive: mobile = bottom sheet cart, desktop = sidebar

### 💡 Menu + Cart + Customization

```javascript
class RestaurantOrder {
  constructor(container) {
    this.container = container;
    this.menu = []; // Will be set via setMenu()
    this.cart = [];  // [{ id, name, price, qty, customizations }]
    this.promoCode = null;
    this.promoDiscount = 0;
    this.activeCategory = null;
    this.customizingItem = null; // Item being customized in modal
    
    this.render();
  }
  
  setMenu(menu) {
    // menu: [{ category, items: [{ id, name, price, description, image, customizations }] }]
    this.menu = menu;
    this.activeCategory = menu[0]?.category;
    this.render();
    this.setupScrollSpy();
  }
  
  render() {
    const subtotal = this.getSubtotal();
    const deliveryFee = subtotal > 0 ? 40 : 0;
    const tax = Math.round(subtotal * 0.05); // 5% GST
    const total = subtotal - this.promoDiscount + deliveryFee + tax;
    
    this.container.innerHTML = `
      <div class="restaurant-order" role="main">
        <div class="menu-section">
          <!-- Category nav -->
          <nav class="category-nav" role="tablist" aria-label="Menu categories">
            ${this.menu.map(cat => `
              <button class="category-tab ${this.activeCategory === cat.category ? 'active' : ''}"
                      role="tab" data-category="${cat.category}"
                      aria-selected="${this.activeCategory === cat.category}">
                ${this._sanitize(cat.category)}
              </button>
            `).join('')}
          </nav>
          
          <!-- Menu items -->
          <div class="menu-items">
            ${this.menu.map(cat => `
              <section class="menu-category" id="cat-${this._slugify(cat.category)}"
                       aria-label="${this._sanitize(cat.category)}">
                <h2>${this._sanitize(cat.category)}</h2>
                ${cat.items.map(item => this.renderMenuItem(item)).join('')}
              </section>
            `).join('')}
          </div>
        </div>
        
        <!-- Cart sidebar (desktop) / bottom sheet (mobile) -->
        <aside class="cart-sidebar" role="complementary" aria-label="Your order">
          <h2>Your Order (${this.cart.reduce((s, i) => s + i.qty, 0)} items)</h2>
          
          ${this.cart.length === 0 
            ? '<p class="empty-cart">Your cart is empty</p>'
            : `
              <ul class="cart-items" role="list">
                ${this.cart.map((item, idx) => `
                  <li class="cart-item" data-cart-idx="${idx}">
                    <div class="cart-item-info">
                      <span class="cart-item-name">${this._sanitize(item.name)}</span>
                      ${item.customizations.length > 0 
                        ? `<span class="cart-item-custom">${item.customizations.map(c => this._sanitize(c)).join(', ')}</span>`
                        : ''}
                    </div>
                    <div class="cart-item-controls">
                      <button class="qty-btn minus" aria-label="Decrease quantity">−</button>
                      <span class="qty">${item.qty}</span>
                      <button class="qty-btn plus" aria-label="Increase quantity">+</button>
                    </div>
                    <span class="cart-item-price">₹${item.price * item.qty}</span>
                  </li>
                `).join('')}
              </ul>
              
              <div class="promo-section">
                <input type="text" class="promo-input" placeholder="Promo code" 
                       maxlength="20" aria-label="Promo code">
                <button class="apply-promo">Apply</button>
                ${this.promoCode 
                  ? `<span class="promo-applied">✓ ${this._sanitize(this.promoCode)} applied (-₹${this.promoDiscount})</span>` 
                  : ''}
              </div>
              
              <div class="cart-summary">
                <div class="summary-row"><span>Subtotal</span><span>₹${subtotal}</span></div>
                ${this.promoDiscount > 0 
                  ? `<div class="summary-row discount"><span>Discount</span><span>-₹${this.promoDiscount}</span></div>` 
                  : ''}
                <div class="summary-row"><span>Delivery fee</span><span>₹${deliveryFee}</span></div>
                <div class="summary-row"><span>GST (5%)</span><span>₹${tax}</span></div>
                <div class="summary-row total"><span>Total</span><span>₹${total}</span></div>
              </div>
              
              <button class="btn-checkout" ${this.cart.length === 0 ? 'disabled' : ''}>
                Proceed to Checkout — ₹${total}
              </button>
            `}
        </aside>
        
        ${this.customizingItem ? this.renderCustomizationModal() : ''}
      </div>
    `;
    
    this.attachListeners();
  }
  
  renderMenuItem(item) {
    const inCart = this.cart.find(c => c.id === item.id);
    
    return `
      <div class="menu-item" data-id="${item.id}">
        <div class="menu-item-info">
          <h3>${this._sanitize(item.name)}</h3>
          <p class="menu-item-desc">${this._sanitize(item.description || '')}</p>
          <span class="menu-item-price">₹${item.price}</span>
        </div>
        ${item.image ? `<img src="${this._sanitize(item.image)}" alt="${this._sanitize(item.name)}" loading="lazy" class="menu-item-img">` : ''}
        <div class="menu-item-action">
          ${inCart 
            ? `<div class="qty-control">
                 <button class="qty-btn minus" data-id="${item.id}">−</button>
                 <span>${inCart.qty}</span>
                 <button class="qty-btn plus" data-id="${item.id}">+</button>
               </div>`
            : `<button class="btn-add" data-id="${item.id}">ADD</button>`
          }
        </div>
      </div>
    `;
  }
  
  renderCustomizationModal() {
    const item = this.customizingItem;
    return `
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Customize ${this._sanitize(item.name)}">
        <div class="customization-modal">
          <h2>Customize ${this._sanitize(item.name)}</h2>
          
          <div class="custom-group">
            <h3>Size</h3>
            ${['Small', 'Medium', 'Large'].map((size, i) => `
              <label class="custom-option">
                <input type="radio" name="size" value="${size}" ${i === 1 ? 'checked' : ''}>
                ${size} ${i > 0 ? `(+₹${i * 30})` : ''}
              </label>
            `).join('')}
          </div>
          
          ${item.toppings ? `
            <div class="custom-group">
              <h3>Extra Toppings</h3>
              ${item.toppings.map(t => `
                <label class="custom-option">
                  <input type="checkbox" name="topping" value="${this._sanitize(t.name)}">
                  ${this._sanitize(t.name)} (+₹${t.price})
                </label>
              `).join('')}
            </div>
          ` : ''}
          
          <div class="custom-group">
            <h3>Special Instructions</h3>
            <textarea class="special-instructions" maxlength="200" 
                      placeholder="Any allergies or preferences?"></textarea>
          </div>
          
          <div class="modal-actions">
            <button class="btn-cancel">Cancel</button>
            <button class="btn-add-custom">Add to Cart — ₹${item.price}</button>
          </div>
        </div>
      </div>
    `;
  }
  
  setupScrollSpy() {
    const sections = this.container.querySelectorAll('.menu-category');
    
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const category = entry.target.querySelector('h2').textContent;
          this.activeCategory = category;
          
          // Update tab highlight without full re-render
          this.container.querySelectorAll('.category-tab').forEach(tab => {
            const isActive = tab.dataset.category === category;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive);
          });
        }
      }
    }, { rootMargin: '-20% 0px -60% 0px' });
    
    sections.forEach(section => observer.observe(section));
  }
  
  addToCart(itemId) {
    const menuItem = this.menu.flatMap(c => c.items).find(i => i.id === itemId);
    if (!menuItem) return;
    
    const existing = this.cart.find(c => c.id === itemId);
    if (existing) {
      existing.qty++;
    } else {
      this.cart.push({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        qty: 1,
        customizations: []
      });
    }
    this.render();
  }
  
  updateQty(itemId, delta) {
    const item = this.cart.find(c => c.id === itemId);
    if (!item) return;
    
    item.qty += delta;
    if (item.qty <= 0) {
      this.cart = this.cart.filter(c => c.id !== itemId);
    }
    this.render();
  }
  
  getSubtotal() {
    return this.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }
  
  async applyPromo(code) {
    // Validate promo code (simulated)
    const promos = { 'FLAT50': 50, 'ZOMATO20': 0.20 };
    const discount = promos[code.toUpperCase()];
    
    if (discount) {
      this.promoCode = code.toUpperCase();
      this.promoDiscount = discount < 1 
        ? Math.round(this.getSubtotal() * discount) 
        : discount;
      this.render();
    } else {
      alert('Invalid promo code');
    }
  }
  
  attachListeners() {
    // Category tab clicks → scroll to section
    this.container.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const section = this.container.querySelector(`#cat-${this._slugify(tab.dataset.category)}`);
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      });
    });
    
    // Add to cart
    this.container.querySelectorAll('.btn-add').forEach(btn => {
      btn.addEventListener('click', () => this.addToCart(btn.dataset.id));
    });
    
    // Quantity +/-
    this.container.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id || btn.closest('[data-cart-idx]')?.dataset.cartIdx;
        if (btn.dataset.id) {
          this.updateQty(btn.dataset.id, btn.classList.contains('plus') ? 1 : -1);
        }
      });
    });
    
    // Promo code
    const promoBtn = this.container.querySelector('.apply-promo');
    if (promoBtn) {
      promoBtn.addEventListener('click', () => {
        const input = this.container.querySelector('.promo-input');
        if (input.value.trim()) this.applyPromo(input.value.trim());
      });
    }
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  
  _slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
}
```

---

## 🎯 Key Takeaways
- Zomato FE = **Restaurant menu + scroll-spy + cart + customization modal + promo codes**
- **Scroll-spy**: IntersectionObserver with `rootMargin: '-20% 0px -60% 0px'` — fires when section is in upper portion of viewport
- **Cart state**: array of `{ id, name, price, qty, customizations }` — recalculate totals on change
- **Customization modal**: radio for single-select (size), checkboxes for multi-select (toppings), textarea for notes
- **Promo code validation**: fixed amount vs percentage — `discount < 1 ? subtotal * discount : discount`
- **Bill breakdown**: subtotal → discount → delivery fee → GST → total — show each line clearly
- **Responsive**: desktop sidebar becomes mobile bottom sheet — CSS `@media` + possibly a slide-up animation
- Zomato FE: **food-tech UX** — scroll-spy menus, customization flows, cart management are standard asks

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Menu, Cart, ScrollSpy, Modal |
| Technical | Medium-Hard | React, Performance |
| HM | Medium | Culture Fit |
