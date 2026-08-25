# Walmart — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Walmart Global Tech |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 (Frontend) |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/walmart-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Shopping Cart with Real-Time Price Updates**
   - Add/remove items, update quantities
   - Apply coupon codes with validation
   - Real-time price calculation (subtotal, tax, discount, total)
   - Persist cart in localStorage
   - Quantity limits (max stock check)

### 💡 Interview-Ready Answer

```javascript
class ShoppingCart {
  constructor(container) {
    this.container = container;
    this.items = [];      // [{id, name, price, qty, maxQty, image}]
    this.coupon = null;   // {code, type: 'percent'|'flat', value}
    this.taxRate = 0.18;  // 18% GST
    this.storageKey = 'walmart-cart';

    this.coupons = {
      'SAVE10':  { type: 'percent', value: 10, minOrder: 500 },
      'FLAT200': { type: 'flat', value: 200, minOrder: 1000 },
      'FIRST50': { type: 'percent', value: 50, minOrder: 0, maxDiscount: 300 },
    };

    this.loadCart();
    this.render();
  }

  // ============================
  // Cart Operations
  // ============================
  addItem(item) {
    const existing = this.items.find(i => i.id === item.id);
    if (existing) {
      if (existing.qty < existing.maxQty) {
        existing.qty++;
      }
    } else {
      this.items.push({ ...item, qty: 1 });
    }
    this.saveCart();
    this.render();
  }

  removeItem(itemId) {
    this.items = this.items.filter(i => i.id !== itemId);
    this.saveCart();
    this.render();
  }

  updateQty(itemId, newQty) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;

    const qty = Math.max(1, Math.min(newQty, item.maxQty));
    item.qty = qty;
    this.saveCart();
    this.render();
  }

  // ============================
  // Coupon System
  // ============================
  applyCoupon(code) {
    const normalizedCode = code.toUpperCase().trim();
    const coupon = this.coupons[normalizedCode];

    if (!coupon) {
      this.couponError = 'Invalid coupon code';
      this.render();
      return false;
    }

    const subtotal = this.getSubtotal();
    if (subtotal < coupon.minOrder) {
      this.couponError = `Minimum order ₹${coupon.minOrder} required`;
      this.render();
      return false;
    }

    this.coupon = { code: normalizedCode, ...coupon };
    this.couponError = null;
    this.saveCart();
    this.render();
    return true;
  }

  removeCoupon() {
    this.coupon = null;
    this.couponError = null;
    this.saveCart();
    this.render();
  }

  // ============================
  // Price Calculations
  // ============================
  getSubtotal() {
    return this.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  getDiscount() {
    if (!this.coupon) return 0;
    const subtotal = this.getSubtotal();

    let discount = 0;
    if (this.coupon.type === 'percent') {
      discount = subtotal * (this.coupon.value / 100);
      if (this.coupon.maxDiscount) {
        discount = Math.min(discount, this.coupon.maxDiscount);
      }
    } else {
      discount = this.coupon.value;
    }

    return Math.min(discount, subtotal); // Never exceed subtotal
  }

  getTax() {
    const taxable = this.getSubtotal() - this.getDiscount();
    return Math.round(taxable * this.taxRate * 100) / 100;
  }

  getTotal() {
    return this.getSubtotal() - this.getDiscount() + this.getTax();
  }

  formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // ============================
  // Persistence
  // ============================
  saveCart() {
    try {
      const data = {
        items: this.items,
        coupon: this.coupon ? this.coupon.code : null,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) { /* quota exceeded or private browsing */ }
  }

  loadCart() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.items = data.items || [];
        if (data.coupon) this.applyCoupon(data.coupon);
      }
    } catch (e) { /* corrupt data */ }
  }

  // ============================
  // Render
  // ============================
  render() {
    this.container.innerHTML = '';
    this.container.style.cssText = `
      max-width: 500px; margin: 0 auto; font-family: -apple-system, sans-serif;
      background: #fff; border-radius: 12px; padding: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
    header.innerHTML = `
      <h2 style="margin: 0; font-size: 20px;">Shopping Cart</h2>
      <span style="color: #666; font-size: 14px;">${this.items.length} item(s)</span>
    `;
    this.container.appendChild(header);

    if (this.items.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align: center; padding: 40px; color: #999;';
      empty.innerHTML = '<div style="font-size: 48px;">🛒</div><p>Your cart is empty</p>';
      this.container.appendChild(empty);
      return;
    }

    // Items list
    this.items.forEach(item => this.renderItem(item));

    // Coupon section
    this.renderCouponSection();

    // Price summary
    this.renderPriceSummary();

    // Checkout button
    const checkoutBtn = document.createElement('button');
    checkoutBtn.textContent = `Checkout — ${this.formatCurrency(this.getTotal())}`;
    checkoutBtn.style.cssText = `
      width: 100%; padding: 14px; background: #0071DC; color: white;
      border: none; border-radius: 8px; font-size: 16px; font-weight: 600;
      cursor: pointer; margin-top: 16px;
    `;
    this.container.appendChild(checkoutBtn);
  }

  renderItem(item) {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex; gap: 12px; padding: 12px 0;
      border-bottom: 1px solid #F0F0F0; align-items: center;
    `;

    // Item info
    const info = document.createElement('div');
    info.style.cssText = 'flex: 1;';
    info.innerHTML = `
      <div style="font-weight: 600; font-size: 15px;">${this.escapeHtml(item.name)}</div>
      <div style="color: #0071DC; font-weight: 700; margin-top: 4px;">
        ${this.formatCurrency(item.price)}
      </div>
    `;

    // Quantity controls
    const qtyControls = document.createElement('div');
    qtyControls.style.cssText = `
      display: flex; align-items: center; gap: 0;
      border: 1px solid #DDD; border-radius: 6px; overflow: hidden;
    `;

    const minusBtn = this.createQtyBtn('−', () => {
      if (item.qty === 1) this.removeItem(item.id);
      else this.updateQty(item.id, item.qty - 1);
    });
    const qtyDisplay = document.createElement('span');
    qtyDisplay.textContent = item.qty;
    qtyDisplay.style.cssText = 'padding: 4px 12px; font-weight: 600; min-width: 24px; text-align: center;';
    const plusBtn = this.createQtyBtn('+', () => this.updateQty(item.id, item.qty + 1));
    if (item.qty >= item.maxQty) {
      plusBtn.disabled = true;
      plusBtn.style.opacity = '0.3';
    }

    qtyControls.appendChild(minusBtn);
    qtyControls.appendChild(qtyDisplay);
    qtyControls.appendChild(plusBtn);

    // Line total
    const lineTotal = document.createElement('div');
    lineTotal.textContent = this.formatCurrency(item.price * item.qty);
    lineTotal.style.cssText = 'font-weight: 700; min-width: 80px; text-align: right;';

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '🗑';
    removeBtn.style.cssText = 'background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px;';
    removeBtn.setAttribute('aria-label', `Remove ${item.name}`);
    removeBtn.addEventListener('click', () => this.removeItem(item.id));

    row.appendChild(info);
    row.appendChild(qtyControls);
    row.appendChild(lineTotal);
    row.appendChild(removeBtn);
    this.container.appendChild(row);
  }

  createQtyBtn(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      background: #F5F5F5; border: none; padding: 6px 10px;
      cursor: pointer; font-size: 16px; font-weight: 600;
    `;
    btn.addEventListener('click', onClick);
    return btn;
  }

  renderCouponSection() {
    const section = document.createElement('div');
    section.style.cssText = 'padding: 12px 0; border-bottom: 1px solid #F0F0F0;';

    if (this.coupon) {
      section.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;
          background: #E8F5E9; padding: 8px 12px; border-radius: 6px;">
          <span style="color: #2E7D32; font-weight: 600;">
            🎫 ${this.coupon.code} applied — Save ${this.formatCurrency(this.getDiscount())}
          </span>
        </div>
      `;
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕';
      removeBtn.style.cssText = 'background: none; border: none; cursor: pointer; color: #666;';
      removeBtn.addEventListener('click', () => this.removeCoupon());
      section.querySelector('div').appendChild(removeBtn);
    } else {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; gap: 8px;';

      const input = document.createElement('input');
      input.placeholder = 'Enter coupon code';
      input.style.cssText = 'flex: 1; padding: 8px 12px; border: 1px solid #DDD; border-radius: 6px;';

      const applyBtn = document.createElement('button');
      applyBtn.textContent = 'Apply';
      applyBtn.style.cssText = `
        padding: 8px 16px; background: #0071DC; color: white;
        border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
      `;
      applyBtn.addEventListener('click', () => this.applyCoupon(input.value));

      row.appendChild(input);
      row.appendChild(applyBtn);
      section.appendChild(row);

      if (this.couponError) {
        const error = document.createElement('div');
        error.textContent = this.couponError;
        error.style.cssText = 'color: #E74C3C; font-size: 12px; margin-top: 4px;';
        section.appendChild(error);
      }
    }

    this.container.appendChild(section);
  }

  renderPriceSummary() {
    const summary = document.createElement('div');
    summary.style.cssText = 'padding: 16px 0;';

    const lines = [
      ['Subtotal', this.getSubtotal()],
      ...(this.coupon ? [['Discount', -this.getDiscount()]] : []),
      ['Tax (18% GST)', this.getTax()],
    ];

    lines.forEach(([label, amount]) => {
      const line = document.createElement('div');
      const isDiscount = amount < 0;
      line.style.cssText = `
        display: flex; justify-content: space-between;
        padding: 4px 0; font-size: 14px;
        color: ${isDiscount ? '#2E7D32' : '#333'};
      `;
      line.innerHTML = `
        <span>${label}</span>
        <span>${isDiscount ? '- ' : ''}${this.formatCurrency(Math.abs(amount))}</span>
      `;
      summary.appendChild(line);
    });

    // Total
    const total = document.createElement('div');
    total.style.cssText = `
      display: flex; justify-content: space-between; padding: 12px 0;
      border-top: 2px solid #333; margin-top: 8px;
      font-size: 18px; font-weight: 700;
    `;
    total.innerHTML = `<span>Total</span><span>${this.formatCurrency(this.getTotal())}</span>`;
    summary.appendChild(total);

    this.container.appendChild(summary);
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Usage
const cart = new ShoppingCart(document.getElementById('cart'));
cart.addItem({ id: 1, name: 'Samsung Galaxy M34 5G', price: 14999, maxQty: 5 });
cart.addItem({ id: 2, name: 'Boat Airdopes 141', price: 1299, maxQty: 3 });
cart.addItem({ id: 3, name: 'Prestige Induction Cooktop', price: 2499, maxQty: 2 });
```

## Round 2: JavaScript Deep Dive
**Duration:** 60 minutes

### Topics Discussed
- Prototype chain and inheritance in JavaScript
- Event delegation patterns for dynamic lists
- Memory management: WeakMap/WeakRef for cache without leaks
- Service Worker caching strategies for offline cart

## Round 3: Frontend Architecture
**Duration:** 60 minutes

### Questions Asked
1. **Design Walmart's Product Listing Page**
   - Multi-faceted filtering (price range, brand, rating, availability)
   - Infinite scroll with windowed rendering
   - SEO-friendly server-side rendering + client-side hydration

## Round 4: Hiring Manager
**Duration:** 30 minutes

## 🎯 Key Takeaways
- Walmart frontend interviews test **e-commerce domain knowledge** — cart, pricing, coupons
- **GST calculation** and currency formatting (Indian locale) shows domain awareness
- localStorage persistence with graceful error handling is expected
- Coupon systems need validation: min order, max discount, expired, stackability rules
- Quantity + stock limit handling is a common follow-up

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Cart, Coupons, localStorage |
| JS Deep Dive | Medium | Prototypes, Event Delegation |
| Architecture | Hard | PLP, SSR, Virtual Scroll |
| Hiring Manager | Easy | Behavioral |
