# Swiggy — SDE-3 Frontend Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/swiggy-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a Restaurant Menu with Cart and Customization
**Duration:** 90 minutes

### Challenge: Build a restaurant menu page with: nested categories, item customization modal (size, toppings, extras), add to cart with variants, cart sidebar with quantity updating, and order total calculation.

```javascript
/**
 * Restaurant Menu with Cart & Customization:
 * 
 * - Nested categories (scrollable nav)
 * - Item cards with veg/non-veg indicator
 * - Customization modal: size (radio), toppings (checkbox), extras
 * - Cart sidebar: quantity +/-, item variants, price breakdown
 * - Sticky category nav with IntersectionObserver
 */
class RestaurantMenu {
  constructor(container, menuData) {
    this.container = container;
    this.menu = menuData; // [{ category, items: [{ id, name, price, veg, customizations }] }]
    this.cart = []; // [{ item, quantity, selectedCustomizations, totalPrice }]
    this.activeCategory = 0;
    this.customizingItem = null;
    
    this.render();
    this.setupCategoryObserver();
  }
  
  // ---- Cart Logic ----
  
  getCartKey(item, customizations) {
    // Unique key based on item + selected customizations
    const custKey = Object.entries(customizations)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${Array.isArray(v) ? v.sort().join('+') : v}`)
      .join('|');
    return `${item.id}__${custKey}`;
  }
  
  calculateItemPrice(item, customizations) {
    let price = item.price;
    
    if (item.customizations) {
      for (const group of item.customizations) {
        const selected = customizations[group.name];
        if (!selected) continue;
        
        if (group.type === 'radio') {
          const option = group.options.find(o => o.name === selected);
          if (option) price += option.price;
        } else if (group.type === 'checkbox') {
          for (const optName of selected) {
            const option = group.options.find(o => o.name === optName);
            if (option) price += option.price;
          }
        }
      }
    }
    
    return price;
  }
  
  addToCart(item, customizations = {}) {
    const key = this.getCartKey(item, customizations);
    const existing = this.cart.find(c => this.getCartKey(c.item, c.selectedCustomizations) === key);
    
    if (existing) {
      existing.quantity++;
    } else {
      this.cart.push({
        item,
        quantity: 1,
        selectedCustomizations: { ...customizations },
        totalPrice: this.calculateItemPrice(item, customizations)
      });
    }
    
    this.renderCart();
  }
  
  updateQuantity(index, delta) {
    const cartItem = this.cart[index];
    if (!cartItem) return;
    
    cartItem.quantity += delta;
    if (cartItem.quantity <= 0) {
      this.cart.splice(index, 1);
    }
    
    this.renderCart();
  }
  
  getCartTotal() {
    const subtotal = this.cart.reduce((sum, c) => sum + c.totalPrice * c.quantity, 0);
    const deliveryFee = subtotal > 500 ? 0 : 40;
    const taxes = Math.round(subtotal * 0.05); // 5% GST
    return { subtotal, deliveryFee, taxes, total: subtotal + deliveryFee + taxes };
  }
  
  // ---- Customization Modal ----
  
  openCustomizationModal(item) {
    this.customizingItem = item;
    const modalState = {};
    
    // Initialize defaults
    if (item.customizations) {
      for (const group of item.customizations) {
        if (group.type === 'radio' && group.options.length > 0) {
          modalState[group.name] = group.options[0].name;
        } else if (group.type === 'checkbox') {
          modalState[group.name] = [];
        }
      }
    }
    
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center';
    
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:16px;padding:24px;width:400px;max-height:80vh;overflow-y:auto';
    
    const renderModal = () => {
      const currentPrice = this.calculateItemPrice(item, modalState);
      
      modal.innerHTML = `
        <h3 style="margin:0 0 4px;font-size:18px">${this.esc(item.name)}</h3>
        <p style="color:#666;font-size:14px;margin:0 0 16px">₹${item.price}</p>
        
        ${(item.customizations || []).map(group => `
          <div style="margin-bottom:16px">
            <div style="font-weight:600;font-size:14px;margin-bottom:8px">
              ${this.esc(group.name)} 
              <span style="color:#888;font-weight:400">${group.required ? '(Required)' : '(Optional)'}</span>
            </div>
            ${group.options.map(opt => `
              <label style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;cursor:pointer;font-size:14px">
                <span style="display:flex;align-items:center;gap:8px">
                  <input type="${group.type}" name="${group.name}" value="${this.esc(opt.name)}"
                    ${group.type === 'radio' && modalState[group.name] === opt.name ? 'checked' : ''}
                    ${group.type === 'checkbox' && (modalState[group.name] || []).includes(opt.name) ? 'checked' : ''}>
                  ${this.esc(opt.name)}
                </span>
                <span style="color:#666">${opt.price > 0 ? `+₹${opt.price}` : 'Included'}</span>
              </label>
            `).join('')}
          </div>
        `).join('')}
        
        <div style="display:flex;gap:12px;margin-top:20px">
          <button id="modal-cancel" style="flex:1;padding:10px;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;font-size:14px">Cancel</button>
          <button id="modal-add" style="flex:1;padding:10px;border:none;border-radius:8px;background:#fc8019;color:#fff;cursor:pointer;font-weight:600;font-size:14px">
            Add — ₹${currentPrice}
          </button>
        </div>
      `;
      
      // Input event handlers
      modal.querySelectorAll('input[type="radio"]').forEach(input => {
        input.addEventListener('change', () => {
          modalState[input.name] = input.value;
          renderModal();
        });
      });
      
      modal.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', () => {
          if (!modalState[input.name]) modalState[input.name] = [];
          if (input.checked) {
            modalState[input.name].push(input.value);
          } else {
            modalState[input.name] = modalState[input.name].filter(v => v !== input.value);
          }
          renderModal();
        });
      });
      
      modal.querySelector('#modal-cancel')?.addEventListener('click', () => overlay.remove());
      modal.querySelector('#modal-add')?.addEventListener('click', () => {
        this.addToCart(item, modalState);
        overlay.remove();
      });
    };
    
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    renderModal();
  }
  
  // ---- Rendering ----
  
  render() {
    this.container.innerHTML = `
      <style>
        .rm-layout { display:flex; font-family:-apple-system,sans-serif; max-width:1100px; margin:0 auto; }
        .rm-menu { flex:1; padding:0 16px; }
        .rm-cart-sidebar { width:320px; flex-shrink:0; border-left:1px solid #e5e7eb; padding:16px; position:sticky; top:0; max-height:100vh; overflow-y:auto; }
        .rm-catnav { display:flex; gap:8px; padding:12px 0; overflow-x:auto; position:sticky; top:0; background:#fff; z-index:10; border-bottom:1px solid #e5e7eb; }
        .rm-catnav-btn { padding:6px 16px; border-radius:20px; border:1px solid #e0e0e0; background:#fff; font-size:13px; cursor:pointer; white-space:nowrap; }
        .rm-catnav-btn.active { background:#fc8019; color:#fff; border-color:#fc8019; }
        .rm-section { padding:16px 0; }
        .rm-section-title { font-size:18px; font-weight:700; margin-bottom:12px; }
        .rm-item { display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #f3f4f6; }
        .rm-item-info { flex:1; }
        .rm-item-name { font-size:14px; font-weight:500; }
        .rm-veg { display:inline-block; width:14px; height:14px; border:1px solid; border-radius:2px; margin-right:4px; position:relative; }
        .rm-veg.veg { border-color:#0f8a0f; }
        .rm-veg.veg::after { content:''; position:absolute; inset:3px; border-radius:50%; background:#0f8a0f; }
        .rm-veg.nonveg { border-color:#e43b4f; }
        .rm-veg.nonveg::after { content:''; position:absolute; top:3px; left:50%; transform:translateX(-50%); border-left:4px solid transparent; border-right:4px solid transparent; border-bottom:7px solid #e43b4f; }
        .rm-item-price { font-size:14px; margin-top:4px; }
        .rm-add-btn { padding:6px 24px; border:1px solid #60b246; color:#60b246; background:#fff; border-radius:4px; font-weight:600; cursor:pointer; font-size:13px; }
        .rm-add-btn:hover { background:#60b246; color:#fff; }
        .rm-cart-empty { text-align:center; padding:40px 0; color:#888; }
        .rm-cart-item { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f3f4f6; font-size:13px; }
        .rm-qty-ctrl { display:flex; align-items:center; gap:8px; border:1px solid #60b246; border-radius:4px; }
        .rm-qty-btn { width:28px; height:28px; border:none; background:transparent; color:#60b246; cursor:pointer; font-size:16px; font-weight:700; }
      </style>
      <div class="rm-layout">
        <div class="rm-menu">
          <div class="rm-catnav" id="cat-nav">
            ${this.menu.map((cat, i) => 
              `<button class="rm-catnav-btn ${i === 0 ? 'active' : ''}" data-cat="${i}">${this.esc(cat.category)}</button>`
            ).join('')}
          </div>
          <div id="menu-sections">
            ${this.menu.map((cat, ci) => `
              <div class="rm-section" data-section="${ci}" id="section-${ci}">
                <div class="rm-section-title">${this.esc(cat.category)}</div>
                ${cat.items.map(item => `
                  <div class="rm-item">
                    <div class="rm-item-info">
                      <div class="rm-item-name">
                        <span class="rm-veg ${item.veg ? 'veg' : 'nonveg'}"></span>
                        ${this.esc(item.name)}
                      </div>
                      <div class="rm-item-price">₹${item.price}</div>
                      ${item.description ? `<div style="font-size:12px;color:#888;margin-top:2px">${this.esc(item.description)}</div>` : ''}
                    </div>
                    <button class="rm-add-btn" data-item-id="${item.id}">ADD</button>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="rm-cart-sidebar" id="cart-sidebar">
          <div class="rm-cart-empty">Your cart is empty</div>
        </div>
      </div>
    `;
    
    // Category nav click
    this.container.querySelectorAll('.rm-catnav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.cat);
        this.container.querySelector(`#section-${idx}`)?.scrollIntoView({ behavior: 'smooth' });
      });
    });
    
    // Add button click
    this.container.querySelectorAll('.rm-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = this.findItem(btn.dataset.itemId);
        if (!item) return;
        
        if (item.customizations && item.customizations.length > 0) {
          this.openCustomizationModal(item);
        } else {
          this.addToCart(item, {});
        }
      });
    });
  }
  
  renderCart() {
    const sidebar = this.container.querySelector('#cart-sidebar');
    if (!sidebar) return;
    
    if (this.cart.length === 0) {
      sidebar.innerHTML = '<div class="rm-cart-empty">Your cart is empty</div>';
      return;
    }
    
    const totals = this.getCartTotal();
    
    sidebar.innerHTML = `
      <h3 style="margin:0 0 12px;font-size:16px">Your Order</h3>
      ${this.cart.map((c, i) => {
        const custDesc = Object.entries(c.selectedCustomizations)
          .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : true))
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' · ');
        
        return `
          <div class="rm-cart-item">
            <div style="flex:1">
              <div style="font-weight:500">${this.esc(c.item.name)}</div>
              ${custDesc ? `<div style="font-size:11px;color:#888">${this.esc(custDesc)}</div>` : ''}
            </div>
            <div class="rm-qty-ctrl">
              <button class="rm-qty-btn" data-idx="${i}" data-delta="-1">−</button>
              <span style="min-width:20px;text-align:center">${c.quantity}</span>
              <button class="rm-qty-btn" data-idx="${i}" data-delta="1">+</button>
            </div>
            <div style="min-width:60px;text-align:right;font-weight:500">₹${(c.totalPrice * c.quantity).toLocaleString('en-IN')}</div>
          </div>
        `;
      }).join('')}
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:13px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Subtotal</span><span>₹${totals.subtotal.toLocaleString('en-IN')}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Delivery</span><span>${totals.deliveryFee === 0 ? '<span style="color:#60b246">FREE</span>' : '₹' + totals.deliveryFee}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Taxes (5% GST)</span><span>₹${totals.taxes.toLocaleString('en-IN')}</span></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:15px;padding-top:8px;border-top:1px solid #e5e7eb"><span>Total</span><span>₹${totals.total.toLocaleString('en-IN')}</span></div>
      </div>
      <button style="width:100%;padding:12px;margin-top:16px;background:#fc8019;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer">
        Place Order — ₹${totals.total.toLocaleString('en-IN')}
      </button>
    `;
    
    // Quantity buttons
    sidebar.querySelectorAll('.rm-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.updateQuantity(parseInt(btn.dataset.idx), parseInt(btn.dataset.delta));
      });
    });
  }
  
  setupCategoryObserver() {
    const sections = this.container.querySelectorAll('.rm-section');
    const navBtns = this.container.querySelectorAll('.rm-catnav-btn');
    
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const idx = parseInt(entry.target.dataset.section);
          navBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.cat) === idx));
        }
      }
    }, { rootMargin: '-20% 0px -70% 0px' });
    
    sections.forEach(s => observer.observe(s));
  }
  
  findItem(id) {
    for (const cat of this.menu) {
      const item = cat.items.find(i => i.id === id);
      if (item) return item;
    }
    return null;
  }
  
  esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
```

---

## 🎯 Key Takeaways
- Swiggy SDE-3 FE = **Restaurant menu with customization modal, cart, and category navigation**
- **Cart key**: item ID + serialized customizations = unique variant key — same item with different toppings = separate cart entries
- **Customization modal**: radio for single-select (size), checkbox for multi-select (toppings), dynamic price update
- **Category nav with IntersectionObserver**: `rootMargin: '-20% 0px -70% 0px'` — section is "active" when in top 20-30% of viewport
- **Veg/Non-veg indicator**: CSS-only — green circle for veg, red triangle for non-veg (Swiggy/Zomato standard)
- **GST calculation**: 5% on food items (Indian standard for restaurant food)
- **Free delivery threshold**: ₹500 — standard Swiggy/Zomato pattern
- Swiggy FE = **food tech UI** — menu, cart, customization, order tracking are core features

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Hard | Menu, Cart, Modal, Observers |
| System Design | Very Hard | Food Delivery Platform |
| HM | Medium | Culture |
