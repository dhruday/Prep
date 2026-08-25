# Grab/Gojek — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Grab/Gojek |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | May 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 3: Frontend Machine Coding — Restaurant Menu & Cart

### Problem
Build a food ordering interface:
1. Restaurant menu with categories (Appetizers, Mains, Desserts, Beverages) — scrollable category tabs
2. Menu items with name, description, price, veg/non-veg badge, customization options
3. Add to cart with quantity +/- controls
4. Floating cart summary bar at bottom with item count and total
5. Cart drawer (slide-up) showing line items, quantity adjustment, remove
6. Search menu items with debounced filter
7. Category sticky headers during scroll

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Food Menu & Cart</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #fff; max-width: 420px; margin: 0 auto; min-height: 100vh; padding-bottom: 70px; }

/* Search */
.search-bar { padding: 12px 16px; position: sticky; top: 0; background: #fff; z-index: 30; border-bottom: 1px solid #f0f0f0; }
.search-input { width: 100%; padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px; outline: none; }
.search-input:focus { border-color: #e23744; }

/* Category Tabs */
.category-tabs { display: flex; gap: 0; overflow-x: auto; position: sticky; top: 56px; background: #fff; z-index: 20; border-bottom: 1px solid #f0f0f0; scrollbar-width: none; }
.category-tabs::-webkit-scrollbar { display: none; }
.cat-tab { padding: 10px 16px; font-size: 13px; font-weight: 500; color: #93959f; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; transition: 0.2s; flex-shrink: 0; }
.cat-tab.active { color: #e23744; border-bottom-color: #e23744; }

/* Menu */
.menu-section { padding: 0 16px; }
.cat-header { font-size: 16px; font-weight: 700; color: #3d4152; padding: 16px 0 8px; position: sticky; top: 96px; background: #fff; z-index: 10; }
.item-count { font-size: 12px; color: #93959f; font-weight: 400; margin-left: 4px; }

.menu-item { display: flex; gap: 12px; padding: 14px 0; border-bottom: 1px solid #f0f0f0; }
.item-info { flex: 1; }
.veg-badge { display: inline-block; width: 14px; height: 14px; border: 1.5px solid; border-radius: 2px; position: relative; margin-bottom: 2px; }
.veg-badge::after { content: ''; position: absolute; width: 6px; height: 6px; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); }
.veg .veg-badge { border-color: #0f8a65; }
.veg .veg-badge::after { background: #0f8a65; }
.nonveg .veg-badge { border-color: #e23744; }
.nonveg .veg-badge::after { background: #e23744; }
.item-name { font-size: 14px; font-weight: 600; color: #3d4152; margin-top: 2px; }
.item-price { font-size: 13px; color: #3d4152; margin-top: 2px; }
.item-desc { font-size: 12px; color: #93959f; margin-top: 4px; line-height: 1.3; }
.customize-tag { font-size: 11px; color: #e23744; margin-top: 2px; }

.item-right { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 80px; }
.item-img { width: 80px; height: 80px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
.add-btn { padding: 4px 20px; background: #fff; border: 1px solid #d4d5d9; border-radius: 4px; color: #60b246; font-weight: 700; font-size: 13px; cursor: pointer; }
.add-btn:hover { background: #f8fff8; }
.qty-control { display: flex; align-items: center; gap: 0; background: #60b246; border-radius: 4px; overflow: hidden; }
.qty-btn { padding: 4px 10px; background: #60b246; border: none; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
.qty-btn:hover { background: #4ea33a; }
.qty-val { padding: 4px 8px; background: #fff; color: #60b246; font-size: 13px; font-weight: 700; min-width: 24px; text-align: center; }

/* Cart Bar */
.cart-bar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 420px; background: #60b246; color: #fff; padding: 14px 20px; display: none; justify-content: space-between; align-items: center; cursor: pointer; z-index: 50; }
.cart-bar.visible { display: flex; }
.cart-summary { font-size: 13px; }
.cart-summary strong { font-size: 15px; }
.view-cart { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 4px; }

/* Cart Drawer */
.drawer-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 60; }
.drawer-overlay.visible { display: block; }
.cart-drawer { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%) translateY(100%); width: 100%; max-width: 420px; background: #fff; border-radius: 12px 12px 0 0; z-index: 70; transition: transform 0.3s; max-height: 70vh; overflow-y: auto; }
.cart-drawer.visible { transform: translateX(-50%) translateY(0); }
.drawer-header { padding: 14px 16px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; }
.drawer-header h3 { font-size: 16px; }
.close-drawer { background: none; border: none; font-size: 18px; cursor: pointer; }
.cart-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #f8f8f8; }
.cart-item-name { flex: 1; font-size: 13px; font-weight: 500; }
.cart-item-price { font-size: 13px; font-weight: 600; min-width: 50px; text-align: right; }
.cart-total { padding: 14px 16px; display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; border-top: 2px solid #f0f0f0; }
.checkout-btn { width: calc(100% - 32px); margin: 8px 16px 16px; padding: 12px; background: #60b246; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
</style>
</head>
<body>

<div class="search-bar"><input class="search-input" id="searchInput" placeholder="🔍 Search for dishes..."></div>
<div class="category-tabs" id="catTabs"></div>
<div class="menu-section" id="menuSection"></div>
<div class="cart-bar" id="cartBar"><div class="cart-summary" id="cartSummary"></div><div class="view-cart">VIEW CART →</div></div>
<div class="drawer-overlay" id="drawerOverlay"></div>
<div class="cart-drawer" id="cartDrawer"></div>

<script>
// ============================================================
// DATA
// ============================================================
const menu = {
  Appetizers: [
    { id: 1, name: 'Paneer Tikka', price: 249, veg: true, emoji: '🧀', desc: 'Grilled cottage cheese with spices', customizable: true },
    { id: 2, name: 'Chicken 65', price: 299, veg: false, emoji: '🍗', desc: 'Spicy deep-fried chicken bites', customizable: false },
    { id: 3, name: 'Veg Spring Rolls', price: 199, veg: true, emoji: '🥟', desc: 'Crispy rolls with vegetable filling', customizable: false },
    { id: 4, name: 'Fish Fingers', price: 349, veg: false, emoji: '🐟', desc: 'Golden fried fish strips with tartar', customizable: true }
  ],
  Mains: [
    { id: 5, name: 'Butter Chicken', price: 399, veg: false, emoji: '🍛', desc: 'Creamy tomato-based chicken curry', customizable: true },
    { id: 6, name: 'Dal Makhani', price: 279, veg: true, emoji: '🥘', desc: 'Slow-cooked black lentils in cream', customizable: false },
    { id: 7, name: 'Chicken Biryani', price: 349, veg: false, emoji: '🍚', desc: 'Fragrant rice with spiced chicken', customizable: true },
    { id: 8, name: 'Paneer Butter Masala', price: 299, veg: true, emoji: '🧈', desc: 'Rich paneer in buttery gravy', customizable: false },
    { id: 9, name: 'Mutton Rogan Josh', price: 499, veg: false, emoji: '🍖', desc: 'Kashmiri-style tender mutton curry', customizable: true }
  ],
  Desserts: [
    { id: 10, name: 'Gulab Jamun', price: 129, veg: true, emoji: '🍩', desc: 'Soft milk dumplings in sugar syrup', customizable: false },
    { id: 11, name: 'Rasmalai', price: 159, veg: true, emoji: '🍮', desc: 'Chenna discs in cardamom milk', customizable: false },
    { id: 12, name: 'Chocolate Brownie', price: 179, veg: true, emoji: '🍫', desc: 'Warm fudgy brownie with ice cream', customizable: true }
  ],
  Beverages: [
    { id: 13, name: 'Mango Lassi', price: 99, veg: true, emoji: '🥭', desc: 'Refreshing mango yogurt drink', customizable: false },
    { id: 14, name: 'Masala Chai', price: 49, veg: true, emoji: '☕', desc: 'Traditional spiced Indian tea', customizable: false },
    { id: 15, name: 'Cold Coffee', price: 129, veg: true, emoji: '🧋', desc: 'Iced coffee with cream', customizable: true }
  ]
};

const categories = Object.keys(menu);
let cart = {}; // { itemId: quantity }
let searchQuery = '';
let drawerOpen = false;

// ============================================================
// RENDER TABS
// ============================================================
function renderTabs(activeCategory) {
  document.getElementById('catTabs').innerHTML = categories.map(c =>
    `<div class="cat-tab${c === activeCategory ? ' active' : ''}" data-cat="${c}">${c}</div>`
  ).join('');

  document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const header = document.getElementById('cat_' + tab.dataset.cat);
      if (header) header.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ============================================================
// RENDER MENU
// ============================================================
function renderMenu() {
  const q = searchQuery.toLowerCase();
  let html = '';

  categories.forEach(cat => {
    const items = menu[cat].filter(i => !q || i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q));
    if (items.length === 0) return;

    html += `<div class="cat-header" id="cat_${cat}">${cat}<span class="item-count">(${items.length})</span></div>`;
    items.forEach(item => {
      const qty = cart[item.id] || 0;
      html += `
        <div class="menu-item">
          <div class="item-info">
            <div class="${item.veg ? 'veg' : 'nonveg'}"><div class="veg-badge"></div></div>
            <div class="item-name">${item.name}</div>
            <div class="item-price">₹${item.price}</div>
            <div class="item-desc">${item.desc}</div>
            ${item.customizable ? '<div class="customize-tag">⚙ Customisable</div>' : ''}
          </div>
          <div class="item-right">
            <div class="item-img">${item.emoji}</div>
            ${qty === 0
              ? `<button class="add-btn" data-id="${item.id}">ADD</button>`
              : `<div class="qty-control"><button class="qty-btn" data-id="${item.id}" data-dir="-">−</button><span class="qty-val">${qty}</span><button class="qty-btn" data-id="${item.id}" data-dir="+">+</button></div>`
            }
          </div>
        </div>
      `;
    });
  });

  document.getElementById('menuSection').innerHTML = html || '<p style="text-align:center;color:#93959f;padding:40px;">No dishes found</p>';
  attachMenuEvents();
  updateCartBar();
}

function attachMenuEvents() {
  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => { cart[btn.dataset.id] = 1; renderMenu(); });
  });

  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (btn.dataset.dir === '+') cart[id] = (cart[id] || 0) + 1;
      else { cart[id]--; if (cart[id] <= 0) delete cart[id]; }
      renderMenu();
    });
  });
}

// ============================================================
// CART BAR
// ============================================================
function updateCartBar() {
  const items = Object.entries(cart);
  const totalQty = items.reduce((s, [, q]) => s + q, 0);
  const totalPrice = items.reduce((s, [id, q]) => {
    const item = findItem(parseInt(id));
    return s + (item ? item.price * q : 0);
  }, 0);

  const bar = document.getElementById('cartBar');
  if (totalQty > 0) {
    bar.classList.add('visible');
    document.getElementById('cartSummary').innerHTML = `<strong>${totalQty} item${totalQty > 1 ? 's' : ''}</strong> | ₹${totalPrice.toLocaleString()}`;
  } else {
    bar.classList.remove('visible');
  }
}

function findItem(id) {
  for (const cat of categories) {
    const item = menu[cat].find(i => i.id === id);
    if (item) return item;
  }
  return null;
}

// ============================================================
// CART DRAWER
// ============================================================
document.getElementById('cartBar').addEventListener('click', () => openDrawer());
document.getElementById('drawerOverlay').addEventListener('click', () => closeDrawer());

function openDrawer() {
  drawerOpen = true;
  renderDrawer();
  document.getElementById('drawerOverlay').classList.add('visible');
  document.getElementById('cartDrawer').classList.add('visible');
}

function closeDrawer() {
  drawerOpen = false;
  document.getElementById('drawerOverlay').classList.remove('visible');
  document.getElementById('cartDrawer').classList.remove('visible');
}

function renderDrawer() {
  const items = Object.entries(cart);
  const total = items.reduce((s, [id, q]) => s + (findItem(parseInt(id))?.price || 0) * q, 0);

  document.getElementById('cartDrawer').innerHTML = `
    <div class="drawer-header"><h3>🛒 Your Cart</h3><button class="close-drawer" onclick="document.getElementById('drawerOverlay').click()">✕</button></div>
    ${items.map(([id, qty]) => {
      const item = findItem(parseInt(id));
      if (!item) return '';
      return `
        <div class="cart-item">
          <div class="${item.veg ? 'veg' : 'nonveg'}"><div class="veg-badge"></div></div>
          <div class="cart-item-name">${item.name}</div>
          <div class="qty-control" style="width:auto;">
            <button class="qty-btn" data-id="${id}" data-dir="-" onclick="cartQty(${id}, -1)">−</button>
            <span class="qty-val">${qty}</span>
            <button class="qty-btn" data-id="${id}" data-dir="+" onclick="cartQty(${id}, 1)">+</button>
          </div>
          <div class="cart-item-price">₹${item.price * qty}</div>
        </div>
      `;
    }).join('')}
    <div class="cart-total"><span>Total</span><span>₹${total.toLocaleString()}</span></div>
    <button class="checkout-btn">Proceed to Checkout →</button>
  `;
}

window.cartQty = function(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  if (Object.keys(cart).length === 0) closeDrawer();
  else renderDrawer();
  renderMenu();
};

// ============================================================
// SEARCH (debounced)
// ============================================================
let searchTimer;
document.getElementById('searchInput').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = e.target.value.trim();
    renderMenu();
  }, 300);
});

// ============================================================
// INIT
// ============================================================
renderTabs(categories[0]);
renderMenu();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- **Veg/Non-veg badge**: green/red bordered square with circle inside — Swiggy/Zomato-style
- **Add to cart**: single "ADD" button switches to ±quantity control after first add
- **Floating cart bar**: fixed bottom, shows item count + total, click opens drawer
- **Cart drawer**: slide-up panel with line items, inline quantity control, total, checkout button
- **Debounced search**: 300ms delay on input, filters across all categories by name + description
- **Category tabs**: horizontal scroll, click scrolls to `element.scrollIntoView({ behavior: 'smooth' })`
- **Sticky category headers**: `position: sticky; top: 96px` — stacks below search + tabs

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Logic, Algorithms |
| Technical 1 | Medium | CSS, Sticky Headers, Layout |
| Technical 2 | Hard | Cart State Management, Drawer, Debounced Search |
| Hiring Manager | Medium | Food-tech, Super-App |
