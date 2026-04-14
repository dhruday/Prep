# Zomato — Senior FE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Zomato |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Gurgaon |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (JS + Machine Coding + FE System Design + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Machine Coding — Restaurant Menu with Cart and Customization

### Problem
Build a restaurant menu page:
- Category-wise menu items with collapsible sections
- Add to cart with quantity controls (+/-)
- Item customization modal (size, toppings, special instructions)
- Cart summary with real-time total
- Veg/Non-veg filter toggle
- Sticky category navigation (scroll spy)

### 💡 Interview-Ready Answer

```javascript
class RestaurantMenu {
  constructor(container, menuData) {
    this.container = container;
    this.menu = menuData; // { categories: [{ name, items: [{ id, name, price, veg, customizations }] }] }
    this.cart = new Map(); // itemKey -> { item, quantity, customizations, unitPrice }
    this.filter = 'all'; // all | veg | nonveg
    this.activeCategory = 0;
    this.collapsedCategories = new Set();

    this.render();
    this.setupScrollSpy();
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'menu-app';
    this.container.style.cssText = 'display:grid;grid-template-columns:1fr 320px;gap:16px;max-width:1100px;margin:0 auto;';

    const leftPanel = document.createElement('div');
    leftPanel.className = 'menu-panel';

    this.renderHeader(leftPanel);
    this.renderCategoryNav(leftPanel);
    this.renderMenuItems(leftPanel);

    const rightPanel = document.createElement('div');
    this.renderCart(rightPanel);

    this.container.appendChild(leftPanel);
    this.container.appendChild(rightPanel);
  }

  renderHeader(parent) {
    const header = document.createElement('div');
    header.className = 'menu-header';
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 0;';

    const title = document.createElement('h2');
    title.textContent = 'Menu';
    title.style.margin = '0';
    header.appendChild(title);

    // Veg/Non-veg toggle
    const filterGroup = document.createElement('div');
    filterGroup.style.cssText = 'display:flex;gap:8px;';

    ['all', 'veg', 'nonveg'].forEach(f => {
      const btn = document.createElement('button');
      btn.textContent = f === 'all' ? 'All' : f === 'veg' ? '🟢 Veg' : '🔴 Non-veg';
      btn.className = `filter-btn ${this.filter === f ? 'active' : ''}`;
      btn.style.cssText = `
        padding:6px 12px;border-radius:20px;border:1px solid #ddd;cursor:pointer;
        font-size:13px;background:${this.filter === f ? '#ff5722' : '#fff'};
        color:${this.filter === f ? '#fff' : '#333'};
      `;
      btn.addEventListener('click', () => { this.filter = f; this.render(); });
      filterGroup.appendChild(btn);
    });

    header.appendChild(filterGroup);
    parent.appendChild(header);
  }

  renderCategoryNav(parent) {
    const nav = document.createElement('nav');
    nav.className = 'category-nav';
    nav.setAttribute('role', 'tablist');
    nav.style.cssText = 'position:sticky;top:0;z-index:10;background:#fff;display:flex;gap:4px;overflow-x:auto;padding:8px 0;border-bottom:1px solid #eee;';

    this.menu.categories.forEach((cat, i) => {
      const itemCount = this.getFilteredItems(cat.items).length;
      if (itemCount === 0) return;

      const tab = document.createElement('button');
      tab.className = `cat-tab ${i === this.activeCategory ? 'active' : ''}`;
      tab.setAttribute('role', 'tab');
      tab.style.cssText = `
        padding:6px 16px;border:none;border-radius:20px;cursor:pointer;
        white-space:nowrap;font-size:13px;
        background:${i === this.activeCategory ? '#ff5722' : '#f5f5f5'};
        color:${i === this.activeCategory ? '#fff' : '#333'};
      `;
      tab.textContent = `${cat.name} (${itemCount})`;
      tab.addEventListener('click', () => {
        const section = this.container.querySelector(`[data-category="${i}"]`);
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      nav.appendChild(tab);
    });

    this.categoryNav = nav;
    parent.appendChild(nav);
  }

  renderMenuItems(parent) {
    this.menuContainer = document.createElement('div');
    this.menuContainer.className = 'menu-items';

    this.menu.categories.forEach((category, catIndex) => {
      const filteredItems = this.getFilteredItems(category.items);
      if (filteredItems.length === 0) return;

      const section = document.createElement('section');
      section.dataset.category = catIndex;

      // Collapsible header
      const catHeader = document.createElement('div');
      catHeader.className = 'category-header';
      catHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:16px 0 8px;cursor:pointer;';

      const catTitle = document.createElement('h3');
      catTitle.style.margin = '0';
      catTitle.textContent = `${category.name} (${filteredItems.length})`;
      catHeader.appendChild(catTitle);

      const chevron = document.createElement('span');
      chevron.textContent = this.collapsedCategories.has(catIndex) ? '▸' : '▾';
      chevron.style.fontSize = '18px';
      catHeader.appendChild(chevron);

      catHeader.addEventListener('click', () => {
        if (this.collapsedCategories.has(catIndex)) {
          this.collapsedCategories.delete(catIndex);
        } else {
          this.collapsedCategories.add(catIndex);
        }
        this.render();
      });

      section.appendChild(catHeader);

      if (!this.collapsedCategories.has(catIndex)) {
        filteredItems.forEach(item => {
          section.appendChild(this.createMenuItem(item));
        });
      }

      this.menuContainer.appendChild(section);
    });

    parent.appendChild(this.menuContainer);
  }

  createMenuItem(item) {
    const el = document.createElement('div');
    el.className = 'menu-item';
    el.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;padding:16px 0;border-bottom:1px solid #f0f0f0;';

    const cartKey = this.getCartKey(item.id);
    const cartEntry = this.cart.get(cartKey);

    el.innerHTML = `
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="color:${item.veg ? '#0f8a0f' : '#e23744'};font-size:16px;">
            ${item.veg ? '🟢' : '🔴'}
          </span>
          <strong>${this.escapeHtml(item.name)}</strong>
        </div>
        <div style="font-size:15px;margin-top:4px;">₹${item.price}</div>
        ${item.description ? `<div style="font-size:13px;color:#666;margin-top:4px;">${this.escapeHtml(item.description)}</div>` : ''}
        ${item.customizations?.length ? '<div style="font-size:12px;color:#ff5722;margin-top:4px;cursor:pointer;" class="customize-link">customisable</div>' : ''}
      </div>
    `;

    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';

    if (cartEntry) {
      const qtyControl = document.createElement('div');
      qtyControl.style.cssText = 'display:flex;align-items:center;gap:0;border:1px solid #0f8a0f;border-radius:6px;overflow:hidden;';

      const minusBtn = document.createElement('button');
      minusBtn.textContent = '−';
      minusBtn.style.cssText = 'width:32px;height:32px;border:none;background:#fff;cursor:pointer;font-size:16px;color:#0f8a0f;';
      minusBtn.addEventListener('click', () => this.updateQuantity(cartKey, -1));

      const qtySpan = document.createElement('span');
      qtySpan.style.cssText = 'width:32px;text-align:center;font-weight:600;color:#0f8a0f;';
      qtySpan.textContent = cartEntry.quantity;

      const plusBtn = document.createElement('button');
      plusBtn.textContent = '+';
      plusBtn.style.cssText = 'width:32px;height:32px;border:none;background:#0f8a0f;cursor:pointer;font-size:16px;color:#fff;';
      plusBtn.addEventListener('click', () => this.updateQuantity(cartKey, 1));

      qtyControl.appendChild(minusBtn);
      qtyControl.appendChild(qtySpan);
      qtyControl.appendChild(plusBtn);
      controls.appendChild(qtyControl);
    } else {
      const addBtn = document.createElement('button');
      addBtn.textContent = 'ADD';
      addBtn.style.cssText = 'padding:6px 24px;border:1px solid #0f8a0f;border-radius:6px;background:#fff;color:#0f8a0f;font-weight:600;cursor:pointer;font-size:14px;';
      addBtn.addEventListener('click', () => {
        if (item.customizations?.length) {
          this.showCustomizationModal(item);
        } else {
          this.addToCart(item);
        }
      });
      controls.appendChild(addBtn);
    }

    el.appendChild(controls);

    // Customize link
    const customizeLink = el.querySelector('.customize-link');
    if (customizeLink) {
      customizeLink.addEventListener('click', () => this.showCustomizationModal(item));
    }

    return el;
  }

  renderCart(parent) {
    parent.className = 'cart-panel';
    parent.style.cssText = 'position:sticky;top:16px;border:1px solid #eee;border-radius:12px;padding:16px;max-height:80vh;overflow-y:auto;';
    parent.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = '🛒 Cart';
    title.style.margin = '0 0 12px 0';
    parent.appendChild(title);

    if (this.cart.size === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'Your cart is empty';
      empty.style.cssText = 'color:#999;text-align:center;padding:24px 0;';
      parent.appendChild(empty);
      return;
    }

    let total = 0;
    for (const [key, entry] of this.cart) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;';

      const subtotal = entry.unitPrice * entry.quantity;
      total += subtotal;

      row.innerHTML = `
        <div>
          <div>${this.escapeHtml(entry.item.name)} × ${entry.quantity}</div>
          ${entry.customizations ? `<div style="font-size:11px;color:#666;">${this.escapeHtml(entry.customizations)}</div>` : ''}
        </div>
        <span>₹${subtotal}</span>
      `;
      parent.appendChild(row);
    }

    // Total
    const totalRow = document.createElement('div');
    totalRow.style.cssText = 'display:flex;justify-content:space-between;padding:12px 0;font-weight:700;font-size:16px;';
    totalRow.innerHTML = `<span>Total</span><span>₹${total}</span>`;
    parent.appendChild(totalRow);

    // Checkout button
    const checkoutBtn = document.createElement('button');
    checkoutBtn.textContent = `Checkout • ₹${total}`;
    checkoutBtn.style.cssText = 'width:100%;padding:12px;background:#ff5722;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;margin-top:8px;';
    parent.appendChild(checkoutBtn);
  }

  showCustomizationModal(item) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100;display:flex;align-items:center;justify-content:center;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:12px;padding:24px;width:400px;max-width:90vw;';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', `Customize ${item.name}`);

    modal.innerHTML = `<h3 style="margin:0 0 16px;">${this.escapeHtml(item.name)}</h3>`;

    const selectedCustom = {};

    item.customizations.forEach(group => {
      const groupEl = document.createElement('div');
      groupEl.innerHTML = `<h4 style="margin:8px 0 4px;font-size:14px;">${this.escapeHtml(group.name)}</h4>`;

      group.options.forEach(opt => {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;';

        const input = document.createElement('input');
        input.type = group.multiSelect ? 'checkbox' : 'radio';
        input.name = group.name;
        input.value = opt.name;
        input.addEventListener('change', () => {
          if (group.multiSelect) {
            if (!selectedCustom[group.name]) selectedCustom[group.name] = [];
            if (input.checked) selectedCustom[group.name].push(opt.name);
            else selectedCustom[group.name] = selectedCustom[group.name].filter(v => v !== opt.name);
          } else {
            selectedCustom[group.name] = opt.name;
          }
        });

        label.appendChild(input);
        label.appendChild(document.createTextNode(
          `${opt.name}${opt.price ? ` (+₹${opt.price})` : ''}`
        ));
        groupEl.appendChild(label);
      });

      modal.appendChild(groupEl);
    });

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:16px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'flex:1;padding:10px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;';
    cancelBtn.addEventListener('click', () => overlay.remove());

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add to Cart';
    addBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:#0f8a0f;color:#fff;cursor:pointer;font-weight:600;';
    addBtn.addEventListener('click', () => {
      const extraCost = this.calculateCustomizationCost(item.customizations, selectedCustom);
      const customLabel = Object.values(selectedCustom).flat().filter(Boolean).join(', ');
      this.addToCart(item, extraCost, customLabel);
      overlay.remove();
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(addBtn);
    modal.appendChild(btnRow);

    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  calculateCustomizationCost(customizations, selected) {
    let extra = 0;
    for (const group of customizations) {
      const sel = selected[group.name];
      if (!sel) continue;
      const values = Array.isArray(sel) ? sel : [sel];
      for (const v of values) {
        const opt = group.options.find(o => o.name === v);
        if (opt?.price) extra += opt.price;
      }
    }
    return extra;
  }

  // === Cart Operations ===

  addToCart(item, extraCost = 0, customLabel = '') {
    const key = this.getCartKey(item.id, customLabel);
    const existing = this.cart.get(key);
    if (existing) {
      existing.quantity++;
    } else {
      this.cart.set(key, {
        item,
        quantity: 1,
        customizations: customLabel,
        unitPrice: item.price + extraCost
      });
    }
    this.render();
  }

  updateQuantity(key, delta) {
    const entry = this.cart.get(key);
    if (!entry) return;
    entry.quantity += delta;
    if (entry.quantity <= 0) this.cart.delete(key);
    this.render();
  }

  getCartKey(itemId, custom = '') {
    return `${itemId}:${custom}`;
  }

  getFilteredItems(items) {
    if (this.filter === 'all') return items;
    return items.filter(i => this.filter === 'veg' ? i.veg : !i.veg);
  }

  setupScrollSpy() {
    // Observe sections via IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this.activeCategory = parseInt(entry.target.dataset.category);
          this.updateCategoryNav();
        }
      }
    }, { threshold: 0.3 });

    setTimeout(() => {
      this.menuContainer?.querySelectorAll('[data-category]').forEach(el => {
        observer.observe(el);
      });
    }, 0);
  }

  updateCategoryNav() {
    this.categoryNav?.querySelectorAll('.cat-tab').forEach((tab, i) => {
      const isActive = i === this.activeCategory;
      tab.style.background = isActive ? '#ff5722' : '#f5f5f5';
      tab.style.color = isActive ? '#fff' : '#333';
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Usage:
// const menuData = {
//   categories: [
//     { name: 'Starters', items: [
//       { id: 1, name: 'Paneer Tikka', price: 249, veg: true, description: 'Grilled cottage cheese',
//         customizations: [{ name: 'Size', multiSelect: false, options: [{name:'Regular'},{name:'Large',price:50}] }] },
//       { id: 2, name: 'Chicken Wings', price: 299, veg: false, description: 'Crispy buffalo wings' },
//     ]},
//     { name: 'Main Course', items: [...] },
//   ]
// };
// new RestaurantMenu(document.getElementById('app'), menuData);
```

## 🎯 Key Takeaways
- Zomato FE interviews are **food-delivery domain** focused — menu, cart, ordering flow
- Collapsible category sections with item counts show clean info hierarchy
- Customization modal with radio/checkbox for single/multi-select options
- Cart key includes customization label so `"Paneer Tikka: Large"` and `"Paneer Tikka: Regular"` are separate entries
- Scroll spy via `IntersectionObserver` for sticky category navigation
- Veg/non-veg filter is core Zomato domain feature

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| JS Fundamentals | Medium | Closures, Async, Event Delegation |
| Machine Coding | Medium-Hard | DOM Manipulation, State, Modal |
| FE System Design | Hard | Food Ordering Platform |
| HM | Medium | Behavioral, Product Thinking |
