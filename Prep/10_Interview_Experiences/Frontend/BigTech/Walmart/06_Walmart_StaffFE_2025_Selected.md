# Walmart — Staff Engineer Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Walmart |
| **Role** | Staff Frontend Engineer |
| **Level** | Staff |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Frontend Coding — Shopping Cart with Promotions Engine

### Problem
Build an e-commerce shopping cart with:
1. Product list with add-to-cart buttons and quantity selector
2. Cart sidebar showing items, subtotal, discounts, total
3. Promotion engine: percentage off, buy-one-get-one, min-spend threshold
4. Apply/remove promo codes
5. Quantity update with debounce to prevent rapid clicks
6. Persist cart in localStorage

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Shopping Cart</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f5f5f5; }

.app { display: flex; min-height: 100vh; }

/* Product Grid */
.product-section { flex: 1; padding: 24px; }
.product-section h2 { font-size: 22px; margin-bottom: 16px; color: #333; }
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.product-card { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: transform 0.15s; }
.product-card:hover { transform: translateY(-2px); }
.product-img { height: 140px; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; font-size: 48px; }
.product-info { padding: 12px; }
.product-name { font-size: 15px; font-weight: 600; color: #222; margin-bottom: 4px; }
.product-price { font-size: 17px; color: #0071dc; font-weight: 700; }
.product-original { text-decoration: line-through; color: #999; font-size: 13px; font-weight: 400; margin-left: 6px; }
.add-btn { display: block; width: 100%; padding: 10px; background: #0071dc; color: #fff; border: none; border-radius: 0 0 10px 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
.add-btn:hover { background: #004ea2; }
.add-btn.in-cart { background: #27ae60; }

/* Cart Sidebar */
.cart-sidebar { width: 380px; background: #fff; border-left: 1px solid #e0e0e0; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; }
.cart-header { padding: 16px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.cart-header h2 { font-size: 18px; color: #222; }
.cart-count { background: #0071dc; color: #fff; border-radius: 12px; padding: 2px 10px; font-size: 13px; font-weight: 600; }

.cart-items { flex: 1; overflow-y: auto; padding: 12px 20px; }
.cart-item { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.cart-item-img { width: 50px; height: 50px; background: #f0f0f0; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.cart-item-details { flex: 1; }
.cart-item-name { font-size: 14px; font-weight: 500; }
.cart-item-price { font-size: 14px; color: #0071dc; font-weight: 600; }
.cart-qty { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.qty-btn { width: 24px; height: 24px; border: 1px solid #ddd; background: #fff; border-radius: 4px; cursor: pointer; font-size: 14px; }
.qty-btn:hover { background: #f0f0f0; }
.qty-val { font-size: 14px; width: 24px; text-align: center; }
.remove-btn { background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 12px; margin-left: 8px; }

/* Promo Code */
.promo-section { padding: 12px 20px; border-top: 1px solid #eee; }
.promo-input-row { display: flex; gap: 6px; }
.promo-input { flex: 1; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; }
.promo-apply { padding: 8px 14px; background: #0071dc; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
.promo-msg { font-size: 12px; margin-top: 6px; }
.promo-success { color: #27ae60; }
.promo-error { color: #e74c3c; }
.applied-promo { display: flex; justify-content: space-between; align-items: center; background: #e8f5e9; padding: 6px 10px; border-radius: 6px; margin-top: 6px; font-size: 13px; }
.applied-promo button { background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 14px; }

/* Summary */
.cart-summary { padding: 16px 20px; border-top: 1px solid #eee; background: #fafafa; }
.summary-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; color: #555; }
.summary-row.discount { color: #27ae60; }
.summary-row.total { font-size: 18px; font-weight: 700; color: #222; margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; }
.checkout-btn { display: block; width: 100%; padding: 14px; background: #ffc220; color: #222; border: none; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 12px; }
.checkout-btn:hover { background: #ffb000; }

.empty-cart { padding: 40px; text-align: center; color: #999; font-size: 14px; }
</style>
</head>
<body>
<div class="app">
  <div class="product-section">
    <h2>Products</h2>
    <div class="product-grid" id="productGrid"></div>
  </div>
  <div class="cart-sidebar">
    <div class="cart-header">
      <h2>Cart</h2>
      <span class="cart-count" id="cartCount">0</span>
    </div>
    <div class="cart-items" id="cartItems"></div>
    <div class="promo-section" id="promoSection"></div>
    <div class="cart-summary" id="cartSummary"></div>
  </div>
</div>

<script>
// ============================================================
// DATA
// ============================================================
const PRODUCTS = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, emoji: '🎧', original: 99.99 },
  { id: 2, name: 'Smart Watch', price: 199.99, emoji: '⌚', original: null },
  { id: 3, name: 'Bluetooth Speaker', price: 49.99, emoji: '🔊', original: 69.99 },
  { id: 4, name: 'USB-C Hub', price: 34.99, emoji: '🔌', original: null },
  { id: 5, name: 'Mechanical Keyboard', price: 129.99, emoji: '⌨️', original: 149.99 },
  { id: 6, name: 'Webcam HD', price: 59.99, emoji: '📷', original: null },
  { id: 7, name: 'Phone Stand', price: 19.99, emoji: '📱', original: 24.99 },
  { id: 8, name: 'LED Desk Lamp', price: 44.99, emoji: '💡', original: null }
];

const PROMOS = {
  'SAVE10': { type: 'percentage', value: 10, label: '10% off', minSpend: 0 },
  'BOGO': { type: 'bogo', value: 0, label: 'Buy One Get One Free (cheapest)', minSpend: 0 },
  'FLAT20': { type: 'flat', value: 20, label: '$20 off', minSpend: 100 },
  'WELCOME': { type: 'percentage', value: 15, label: '15% off (min $50)', minSpend: 50 }
};

const STORAGE_KEY = 'walmart_cart';

// ============================================================
// STATE
// ============================================================
let cart = loadCart();
let appliedPromo = null;
let promoMessage = '';

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch { return {}; }
}

function saveCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch {}
}

// ============================================================
// CART OPERATIONS
// ============================================================
function addToCart(productId) {
  cart[productId] = (cart[productId] || 0) + 1;
  saveCart(); renderAll();
}

let qtyTimers = {};
function updateQty(productId, delta) {
  // Debounce rapid clicks
  clearTimeout(qtyTimers[productId]);
  qtyTimers[productId] = setTimeout(() => {
    const newQty = (cart[productId] || 0) + delta;
    if (newQty <= 0) { delete cart[productId]; }
    else { cart[productId] = newQty; }
    saveCart(); renderAll();
  }, 150);
}

function removeFromCart(productId) {
  delete cart[productId];
  saveCart(); renderAll();
}

function getCartItems() {
  return Object.entries(cart).map(([id, qty]) => {
    const product = PRODUCTS.find(p => p.id === parseInt(id));
    return product ? { ...product, qty } : null;
  }).filter(Boolean);
}

// ============================================================
// PROMO ENGINE
// ============================================================
function calculateDiscount(items, promo) {
  if (!promo) return 0;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (subtotal < promo.minSpend) return 0;

  switch (promo.type) {
    case 'percentage':
      return subtotal * (promo.value / 100);
    case 'flat':
      return Math.min(promo.value, subtotal);
    case 'bogo': {
      // Free item = cheapest item in cart
      if (items.length < 2 && items.every(i => i.qty < 2)) return 0;
      const allPrices = items.flatMap(item => Array(item.qty).fill(item.price)).sort((a, b) => a - b);
      return allPrices.length >= 2 ? allPrices[0] : 0;
    }
    default: return 0;
  }
}

function applyPromo(code) {
  const promo = PROMOS[code.toUpperCase()];
  if (!promo) { promoMessage = 'Invalid promo code'; appliedPromo = null; renderAll(); return; }

  const items = getCartItems();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  if (subtotal < promo.minSpend) {
    promoMessage = `Minimum spend $${promo.minSpend} required`;
    renderAll(); return;
  }

  appliedPromo = { code: code.toUpperCase(), ...promo };
  promoMessage = '';
  renderAll();
}

function removePromo() {
  appliedPromo = null;
  promoMessage = '';
  renderAll();
}

// ============================================================
// RENDERING
// ============================================================
function renderAll() {
  renderProducts();
  renderCart();
  renderPromo();
  renderSummary();
}

function renderProducts() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';
  PRODUCTS.forEach(p => {
    const inCart = cart[p.id] > 0;
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-img">${p.emoji}</div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-price">$${p.price.toFixed(2)}
          ${p.original ? `<span class="product-original">$${p.original.toFixed(2)}</span>` : ''}
        </div>
      </div>
      <button class="add-btn ${inCart ? 'in-cart' : ''}">${inCart ? `✓ In Cart (${cart[p.id]})` : 'Add to Cart'}</button>
    `;
    card.querySelector('.add-btn').addEventListener('click', () => addToCart(p.id));
    grid.appendChild(card);
  });
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const items = getCartItems();
  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
  document.getElementById('cartCount').textContent = totalQty;

  if (items.length === 0) {
    container.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
    return;
  }

  container.innerHTML = '';
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <div class="cart-item-img">${item.emoji}</div>
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
        <div class="cart-qty">
          <button class="qty-btn minus">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn plus">+</button>
          <button class="remove-btn">Remove</button>
        </div>
      </div>
    `;
    el.querySelector('.minus').addEventListener('click', () => updateQty(item.id, -1));
    el.querySelector('.plus').addEventListener('click', () => updateQty(item.id, 1));
    el.querySelector('.remove-btn').addEventListener('click', () => removeFromCart(item.id));
    container.appendChild(el);
  });
}

function renderPromo() {
  const section = document.getElementById('promoSection');
  section.innerHTML = `
    <div class="promo-input-row">
      <input type="text" class="promo-input" id="promoInput" placeholder="Promo code" maxlength="20">
      <button class="promo-apply" id="promoApplyBtn">Apply</button>
    </div>
    ${promoMessage ? `<div class="promo-msg ${appliedPromo ? 'promo-success' : 'promo-error'}">${promoMessage}</div>` : ''}
  `;

  if (appliedPromo) {
    const tag = document.createElement('div');
    tag.className = 'applied-promo';
    tag.innerHTML = `<span>🏷️ ${appliedPromo.code}: ${appliedPromo.label}</span><button>✕</button>`;
    tag.querySelector('button').addEventListener('click', removePromo);
    section.appendChild(tag);
  }

  section.querySelector('#promoApplyBtn').addEventListener('click', () => {
    const code = section.querySelector('#promoInput').value.trim();
    if (code) applyPromo(code);
  });

  section.querySelector('#promoInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const code = e.target.value.trim();
      if (code) applyPromo(code);
    }
  });
}

function renderSummary() {
  const container = document.getElementById('cartSummary');
  const items = getCartItems();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = calculateDiscount(items, appliedPromo);
  const shipping = subtotal > 35 ? 0 : 5.99;
  const tax = (subtotal - discount) * 0.08;
  const total = subtotal - discount + shipping + tax;

  container.innerHTML = `
    <div class="summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
    ${discount > 0 ? `<div class="summary-row discount"><span>Discount</span><span>-$${discount.toFixed(2)}</span></div>` : ''}
    <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span></div>
    <div class="summary-row"><span>Tax (8%)</span><span>$${tax.toFixed(2)}</span></div>
    <div class="summary-row total"><span>Total</span><span>$${Math.max(0, total).toFixed(2)}</span></div>
    <button class="checkout-btn" ${items.length === 0 ? 'disabled' : ''}>Checkout</button>
    ${subtotal > 0 && subtotal < 35 ? `<div style="font-size:12px;color:#888;margin-top:6px;text-align:center;">Add $${(35 - subtotal).toFixed(2)} more for free shipping</div>` : ''}
  `;
}

// Initial render
renderAll();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Walmart FE expects **e-commerce expertise** — cart with promotions is core
- Promo engine types: percentage, flat amount, BOGO (cheapest free) — each is a distinct strategy
- **Quantity debounce** (150ms) prevents rapid increment/decrement from spamming state updates
- Free shipping threshold with "add $X more" nudge — real conversion optimization detail
- Tax calculation: `(subtotal - discount) * rate` — discount applied before tax
- BOGO logic: flatten all prices → sort → cheapest item is free
- Min-spend validation on promo codes prevents invalid applications
- localStorage persistence with graceful JSON parse fallback

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Strings |
| Technical 1 | Medium | DOM, State Management |
| Technical 2 | Hard | E-Commerce Cart, Promo Engine, localStorage |
| Hiring Manager | Medium | Architecture Thinking, Leadership |
