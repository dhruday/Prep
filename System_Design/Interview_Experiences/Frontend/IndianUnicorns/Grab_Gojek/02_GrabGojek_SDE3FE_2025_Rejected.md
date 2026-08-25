# Grab/Gojek — Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Grab/Gojek |
| **Role** | Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Frontend Machine Coding — Food Delivery Order Tracker

### Problem
Build a food delivery order tracking interface:
1. Order progress stepper: Confirmed ➜ Preparing ➜ Ready ➜ Picked Up ➜ Arriving ➜ Delivered
2. Map area showing delivery partner blip moving toward destination
3. Estimated time remaining with countdown
4. Order summary: items, quantities, total
5. Delivery partner card with contact option
6. Support chat button with preset quick messages
7. Tip delivery partner option (post-delivery)

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Food Delivery Tracker</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f8fafc; max-width: 420px; margin: 0 auto; min-height: 100vh; }

.header { padding: 16px 20px; background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.header h2 { font-size: 16px; color: #0f172a; }
.order-id { font-size: 11px; color: #94a3b8; font-family: monospace; }

/* Map */
.map-section { height: 200px; background: linear-gradient(135deg, #e0f2fe, #dbeafe); position: relative; overflow: hidden; }
.map-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(148,163,184,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.1) 1px, transparent 1px); background-size: 30px 30px; }
.delivery-blip { position: absolute; width: 30px; height: 30px; background: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 0 0 4px rgba(22,163,74,.2); transition: left 1.5s ease, top 1.5s ease; z-index: 5; }
.dest-marker { position: absolute; font-size: 22px; z-index: 3; }
.eta-badge { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); background: #fff; padding: 6px 16px; border-radius: 20px; box-shadow: 0 2px 8px rgba(0,0,0,.1); font-size: 13px; font-weight: 600; z-index: 10; }

/* Stepper */
.stepper { padding: 16px 20px; background: #fff; border-bottom: 1px solid #f1f5f9; }
.stepper-bar { display: flex; align-items: center; overflow-x: auto; gap: 0; }
.step { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.step-dot { width: 20px; height: 20px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; transition: 0.3s; }
.step-dot.active { background: #f59e0b; animation: dotBounce 0.4s ease; }
.step-dot.done { background: #16a34a; }
@keyframes dotBounce { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
.step-line { width: 16px; height: 2px; background: #e2e8f0; flex-shrink: 0; }
.step-line.done { background: #16a34a; }
.step-label { font-size: 9px; color: #94a3b8; margin-top: 4px; text-align: center; }
.step.current .step-label { color: #f59e0b; font-weight: 600; }

/* Order Summary */
.section { padding: 16px 20px; background: #fff; border-bottom: 1px solid #f1f5f9; }
.section h3 { font-size: 13px; color: #334155; margin-bottom: 10px; }
.item-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
.item-name { color: #475569; }
.item-qty { color: #94a3b8; font-size: 12px; }
.item-price { font-weight: 600; color: #0f172a; }
.total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px; }

/* Delivery Partner Card */
.partner-card { display: flex; gap: 12px; align-items: center; }
.partner-avatar { width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.partner-info { flex: 1; }
.partner-name { font-size: 14px; font-weight: 600; }
.partner-vehicle { font-size: 12px; color: #64748b; }
.partner-rating { font-size: 12px; color: #f59e0b; }
.call-btn { width: 40px; height: 40px; background: #dcfce7; border: none; border-radius: 50%; font-size: 18px; cursor: pointer; }

/* Support Chat */
.support-section { padding: 16px 20px; background: #fff; }
.support-section h3 { font-size: 13px; color: #334155; margin-bottom: 8px; }
.quick-msgs { display: flex; flex-wrap: wrap; gap: 6px; }
.quick-msg { padding: 6px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 16px; font-size: 11px; color: #475569; cursor: pointer; transition: 0.2s; }
.quick-msg:hover { background: #2563eb; color: #fff; border-color: #2563eb; }

/* Tip Section */
.tip-section { padding: 16px 20px; background: #fff; display: none; }
.tip-section.visible { display: block; }
.tip-options { display: flex; gap: 8px; }
.tip-btn { flex: 1; padding: 10px; background: #f1f5f9; border: 2px solid transparent; border-radius: 8px; text-align: center; cursor: pointer; font-size: 13px; font-weight: 600; transition: 0.2s; }
.tip-btn.selected { border-color: #16a34a; background: #dcfce7; }
.tip-submit { width: 100%; margin-top: 10px; padding: 10px; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
</style>
</head>
<body>

<div class="header">
  <div>
    <h2>🍔 Your Order</h2>
    <div class="order-id">Order #GJ2025-83KX</div>
  </div>
  <button style="background:none;border:none;font-size:18px;cursor:pointer;">✕</button>
</div>

<div class="map-section" id="mapSection">
  <div class="map-grid"></div>
  <div class="eta-badge" id="etaBadge">⏱ 15 min</div>
  <div class="delivery-blip" id="blip">🛵</div>
  <div class="dest-marker" id="destMarker">🏠</div>
</div>

<div class="stepper" id="stepperContainer"></div>

<div class="section">
  <h3>📋 Order Summary</h3>
  <div id="orderItems"></div>
</div>

<div class="section">
  <h3>🚴 Delivery Partner</h3>
  <div class="partner-card">
    <div class="partner-avatar">👤</div>
    <div class="partner-info">
      <div class="partner-name">Suresh K.</div>
      <div class="partner-vehicle">Hero Splendor · KA 05 EQ 1234</div>
      <div class="partner-rating">⭐ 4.7 · 843 deliveries</div>
    </div>
    <button class="call-btn" title="Call">📞</button>
  </div>
</div>

<div class="support-section">
  <h3>💬 Need Help?</h3>
  <div class="quick-msgs" id="quickMsgs"></div>
</div>

<div class="tip-section" id="tipSection">
  <h3>💚 Thank your delivery partner</h3>
  <div class="tip-options" id="tipOptions"></div>
  <button class="tip-submit" id="tipSubmit">Send Tip</button>
</div>

<script>
// ============================================================
// DATA
// ============================================================
const STEPS = ['Confirmed', 'Preparing', 'Ready', 'Picked Up', 'Arriving', 'Delivered'];
let currentStep = 0;
let etaSeconds = 900; // 15 min

const orderItems = [
  { name: 'Chicken Biryani', qty: 1, price: 320 },
  { name: 'Butter Naan (2)', qty: 2, price: 80 },
  { name: 'Paneer Tikka', qty: 1, price: 260 },
  { name: 'Cold Drink 500ml', qty: 1, price: 40 }
];

const quickMessages = [
  'Where is my order?', 'Wrong item received',
  'Order is late', 'Request extra napkins',
  'Cancel order', 'Contact restaurant'
];

const tipAmounts = [20, 30, 50, 'Custom'];

// ============================================================
// ORDER SUMMARY
// ============================================================
function renderOrder() {
  const total = orderItems.reduce((s, it) => s + it.price * it.qty, 0);
  document.getElementById('orderItems').innerHTML =
    orderItems.map(it => `
      <div class="item-row">
        <div><span class="item-name">${it.name}</span> <span class="item-qty">× ${it.qty}</span></div>
        <div class="item-price">₹${it.price * it.qty}</div>
      </div>
    `).join('') +
    `<div class="total-row"><span>Total</span><span>₹${total}</span></div>`;
}

// ============================================================
// STEPPER
// ============================================================
function renderStepper() {
  const container = document.getElementById('stepperContainer');
  container.innerHTML = `<div class="stepper-bar">${STEPS.map((s, i) => {
    const cls = i < currentStep ? 'done' : i === currentStep ? 'active' : '';
    const isCurrent = i === currentStep;
    return `
      <div class="step${isCurrent ? ' current' : ''}">
        <div>
          <div class="step-dot ${cls}">${i < currentStep ? '✓' : i + 1}</div>
          <div class="step-label">${s}</div>
        </div>
      </div>
      ${i < STEPS.length - 1 ? `<div class="step-line${i < currentStep ? ' done' : ''}"></div>` : ''}
    `;
  }).join('')}</div>`;
}

// ============================================================
// MAP SIMULATION
// ============================================================
function updateMap() {
  const map = document.getElementById('mapSection');
  const w = map.offsetWidth;
  const h = map.offsetHeight;

  // Destination at right side
  document.getElementById('destMarker').style.cssText = `right:20px; bottom:30px;`;

  // Blip moves from left to right
  const progress = currentStep / (STEPS.length - 1);
  const bx = 20 + (w - 80) * progress;
  const by = h * 0.4 + Math.sin(progress * Math.PI) * 30;
  const blip = document.getElementById('blip');
  blip.style.left = bx + 'px';
  blip.style.top = by + 'px';
}

// ============================================================
// ETA
// ============================================================
function updateETA() {
  if (currentStep >= STEPS.length - 1) {
    document.getElementById('etaBadge').textContent = '🎉 Delivered!';
    return;
  }
  const min = Math.floor(etaSeconds / 60);
  const sec = etaSeconds % 60;
  document.getElementById('etaBadge').textContent = `⏱ ${min}:${String(sec).padStart(2, '0')}`;
}

// ============================================================
// QUICK MESSAGES
// ============================================================
function renderQuickMsgs() {
  document.getElementById('quickMsgs').innerHTML = quickMessages.map(m =>
    `<div class="quick-msg" onclick="sendQuickMsg('${m}')">${m}</div>`
  ).join('');
}

function sendQuickMsg(msg) {
  alert(`Support message sent: "${msg}"\nYou'll hear back within 2 minutes.`);
}

// ============================================================
// TIP SECTION
// ============================================================
let selectedTip = null;

function renderTips() {
  document.getElementById('tipOptions').innerHTML = tipAmounts.map((t, i) => {
    const label = typeof t === 'number' ? `₹${t}` : '✏️ Custom';
    return `<div class="tip-btn" data-idx="${i}" onclick="selectTip(${i})">${label}</div>`;
  }).join('');
}

function selectTip(idx) {
  selectedTip = idx;
  document.querySelectorAll('.tip-btn').forEach((b, i) => {
    b.classList.toggle('selected', i === idx);
  });
}

document.getElementById('tipSubmit').addEventListener('click', () => {
  if (selectedTip === null) { alert('Please select a tip amount'); return; }
  const amount = typeof tipAmounts[selectedTip] === 'number'
    ? tipAmounts[selectedTip]
    : parseInt(prompt('Enter custom tip amount (₹):') || '0', 10);
  if (amount > 0) {
    alert(`₹${amount} tip sent to Suresh K. Thank you! 💚`);
    document.getElementById('tipSection').innerHTML = '<p style="padding:16px;text-align:center;color:#16a34a;font-weight:600;">✓ Tip sent successfully!</p>';
  }
}

// ============================================================
// SIMULATION
// ============================================================
function tick() {
  if (currentStep >= STEPS.length - 1) return;

  etaSeconds = Math.max(0, etaSeconds - 5);
  updateETA();

  // Advance step every ~150s
  if (etaSeconds > 0 && etaSeconds % 150 === 0 && currentStep < STEPS.length - 1) {
    currentStep++;
    renderStepper();
    updateMap();

    if (currentStep >= STEPS.length - 1) {
      document.getElementById('tipSection').classList.add('visible');
    }
  }
}

// Init
renderOrder();
renderStepper();
updateMap();
updateETA();
renderQuickMsgs();
renderTips();
setInterval(tick, 1000);
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Got rejected — missed implementing the **countdown timer sync with route progress** properly
- Stepper dots: done=green ✓, active=amber bounce, upcoming=gray
- Map blip position tied to step progress with smooth CSS transition
- Quick support messages: bubble chips that trigger alert (production: WebSocket chat)
- Post-delivery tip section: hidden by default, revealed via `classList.add('visible')`
- Order summary with calculated totals from item array

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Logic, Algorithms |
| Technical 1 | Medium | DOM, CSS Grid, Stepper |
| Technical 2 | Hard | Real-Time, Map Simulation, State |
| Hiring Manager | Medium | Super-app, Delivery |
