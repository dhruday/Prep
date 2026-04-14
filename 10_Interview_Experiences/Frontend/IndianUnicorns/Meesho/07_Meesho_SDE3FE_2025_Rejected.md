# Meesho — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meesho |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 3: Frontend Machine Coding — Multi-Step Order Tracking UI

### Problem
Build a package order tracking interface:
1. Order summary card with items, prices, and status badge
2. Tracking timeline: vertical stepper showing each status change with timestamps
3. Live status updates (simulated via polling/interval)
4. Expandable delivery details panel
5. Estimated delivery countdown timer
6. Map placeholder showing delivery route progress bar
7. Copy tracking ID with clipboard API

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Order Tracking</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f5f0ff; min-height: 100vh; display: flex; justify-content: center; padding: 24px; }

.container { width: 520px; }

/* Order Card */
.order-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 16px; }
.order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.order-id { font-size: 14px; color: #6b7280; }
.order-id span { font-weight: 600; color: #1f2937; cursor: pointer; }
.copy-btn { background: none; border: 1px solid #ddd; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; color: #6b7280; }
.copy-btn.copied { color: #10b981; border-color: #10b981; }
.status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.status-ordered { background: #e8f0fe; color: #1d4ed8; }
.status-confirmed { background: #e8f5e9; color: #16a34a; }
.status-shipped { background: #fff3e0; color: #ea580c; }
.status-out_for_delivery { background: #fce4ec; color: #dc2626; }
.status-delivered { background: #e8f5e9; color: #16a34a; }

.order-items { border-top: 1px solid #f0f0f0; padding-top: 12px; }
.item-row { display: flex; gap: 10px; align-items: center; padding: 6px 0; }
.item-emoji { font-size: 28px; }
.item-info { flex: 1; }
.item-name { font-size: 14px; font-weight: 500; }
.item-qty { font-size: 12px; color: #6b7280; }
.item-price { font-size: 14px; font-weight: 600; }
.order-total { display: flex; justify-content: space-between; border-top: 1px solid #f0f0f0; padding-top: 8px; margin-top: 8px; font-weight: 600; }

/* Countdown */
.countdown-bar { background: #fff; border-radius: 12px; padding: 16px 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 16px; }
.countdown-label { font-size: 13px; color: #6b7280; margin-bottom: 6px; }
.countdown-time { font-size: 22px; font-weight: 700; color: #570050; }
.progress-track { height: 6px; background: #e5e7eb; border-radius: 3px; margin-top: 10px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #570050, #9333ea); border-radius: 3px; transition: width 0.5s; }

/* Timeline */
.timeline-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 16px; }
.timeline-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.timeline { position: relative; padding-left: 28px; }
.timeline::before { content: ''; position: absolute; left: 8px; top: 12px; bottom: 12px; width: 2px; background: #e5e7eb; }
.step { position: relative; padding-bottom: 20px; }
.step:last-child { padding-bottom: 0; }
.step-dot { position: absolute; left: -24px; top: 4px; width: 16px; height: 16px; border-radius: 50%; border: 2px solid #d1d5db; background: #fff; z-index: 1; }
.step.completed .step-dot { background: #570050; border-color: #570050; }
.step.active .step-dot { background: #fff; border-color: #570050; box-shadow: 0 0 0 3px rgba(87,0,80,0.2); }
.step.active .step-dot::after { content: ''; position: absolute; top: 3px; left: 3px; width: 6px; height: 6px; background: #570050; border-radius: 50%; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.step-content {}
.step-label { font-size: 14px; font-weight: 500; color: #1f2937; }
.step.pending .step-label { color: #9ca3af; }
.step-time { font-size: 12px; color: #6b7280; margin-top: 2px; }
.step-detail { font-size: 12px; color: #9ca3af; margin-top: 2px; }

/* Delivery Details */
.details-toggle { background: none; border: none; color: #570050; font-size: 13px; cursor: pointer; font-weight: 500; margin-top: 12px; }
.details-panel { max-height: 0; overflow: hidden; transition: max-height 0.3s; }
.details-panel.open { max-height: 200px; }
.details-content { padding: 12px 0; font-size: 13px; color: #374151; }
.detail-row { display: flex; justify-content: space-between; padding: 4px 0; }
.detail-row span:first-child { color: #6b7280; }

/* Live indicator */
.live-indicator { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #16a34a; margin-bottom: 12px; }
.live-dot { width: 8px; height: 8px; background: #16a34a; border-radius: 50%; animation: pulse 1.5s infinite; }
</style>
</head>
<body>
<div class="container">
  <div class="order-card" id="orderCard"></div>
  <div class="countdown-bar" id="countdown"></div>
  <div class="timeline-card" id="timelineCard"></div>
</div>

<script>
// ============================================================
// DATA
// ============================================================
const ORDER = {
  id: 'MSH-2025-789456',
  items: [
    { name: 'Floral Kurti Set', qty: 1, price: 599, emoji: '👗' },
    { name: 'Cotton Dupatta', qty: 2, price: 249, emoji: '🧣' },
    { name: 'Palazzo Pants', qty: 1, price: 449, emoji: '👖' }
  ],
  total: 1546,
  deliveryAddress: '123 MG Road, Koramangala, Bangalore 560034',
  courierPartner: 'Delhivery Express',
  courierPhone: '+91-9876543210',
  estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
};

const TRACKING_STEPS = [
  { status: 'ordered', label: 'Order Placed', detail: 'Your order has been placed successfully', time: new Date(Date.now() - 3 * 24 * 3600000) },
  { status: 'confirmed', label: 'Order Confirmed', detail: 'Seller has confirmed your order', time: new Date(Date.now() - 2.5 * 24 * 3600000) },
  { status: 'shipped', label: 'Shipped', detail: 'Package picked up by courier', time: new Date(Date.now() - 1.5 * 24 * 3600000) },
  { status: 'out_for_delivery', label: 'Out for Delivery', detail: 'Package is with delivery agent', time: null },
  { status: 'delivered', label: 'Delivered', detail: 'Package delivered successfully', time: null }
];

let currentStepIndex = 2; // Start at "shipped"
let detailsOpen = false;

// ============================================================
// RENDERING
// ============================================================
function getCurrentStatus() {
  return TRACKING_STEPS[currentStepIndex].status;
}

function renderOrder() {
  const card = document.getElementById('orderCard');
  const status = getCurrentStatus();
  const statusLabel = TRACKING_STEPS[currentStepIndex].label;

  card.innerHTML = `
    <div class="order-header">
      <div class="order-id">Order: <span id="orderId">${ORDER.id}</span>
        <button class="copy-btn" id="copyBtn">Copy</button>
      </div>
      <span class="status-badge status-${status}">${statusLabel}</span>
    </div>
    <div class="order-items">
      ${ORDER.items.map(item => `
        <div class="item-row">
          <div class="item-emoji">${item.emoji}</div>
          <div class="item-info">
            <div class="item-name">${item.name}</div>
            <div class="item-qty">Qty: ${item.qty}</div>
          </div>
          <div class="item-price">₹${(item.price * item.qty).toLocaleString('en-IN')}</div>
        </div>
      `).join('')}
      <div class="order-total"><span>Total</span><span>₹${ORDER.total.toLocaleString('en-IN')}</span></div>
    </div>
  `;

  // Copy to clipboard
  document.getElementById('copyBtn').addEventListener('click', async () => {
    const btn = document.getElementById('copyBtn');
    try {
      await navigator.clipboard.writeText(ORDER.id);
      btn.textContent = '✓ Copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = ORDER.id;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      btn.textContent = '✓ Copied';
    }
  });
}

function renderCountdown() {
  const el = document.getElementById('countdown');
  const now = new Date();
  const diff = ORDER.estimatedDelivery - now;
  const totalDuration = 4 * 24 * 3600000; // total estimated 4 days
  const elapsed = totalDuration - diff;
  const progressPct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

  if (diff <= 0 || currentStepIndex >= 4) {
    el.innerHTML = `
      <div class="countdown-label">Delivery Status</div>
      <div class="countdown-time" style="color:#16a34a;">✅ Delivered!</div>
      <div class="progress-track"><div class="progress-fill" style="width:100%"></div></div>
    `;
    return;
  }

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  el.innerHTML = `
    <div class="countdown-label">Estimated Delivery In</div>
    <div class="countdown-time">${hours}h ${minutes}m ${seconds}s</div>
    <div class="progress-track"><div class="progress-fill" style="width:${progressPct}%"></div></div>
  `;
}

function renderTimeline() {
  const card = document.getElementById('timelineCard');

  let html = `
    <div class="live-indicator"><span class="live-dot"></span> Live Tracking</div>
    <div class="timeline-title">Tracking Timeline</div>
    <div class="timeline">
  `;

  TRACKING_STEPS.forEach((step, i) => {
    let state = 'pending';
    if (i < currentStepIndex) state = 'completed';
    else if (i === currentStepIndex) state = 'active';

    const timeStr = step.time ? formatTime(step.time) : (state === 'pending' ? 'Pending' : '');

    html += `
      <div class="step ${state}">
        <div class="step-dot"></div>
        <div class="step-content">
          <div class="step-label">${step.label}</div>
          <div class="step-time">${timeStr}</div>
          ${state !== 'pending' ? `<div class="step-detail">${step.detail}</div>` : ''}
        </div>
      </div>
    `;
  });

  html += '</div>';

  html += `<button class="details-toggle" id="detailsToggle">${detailsOpen ? 'Hide' : 'Show'} Delivery Details ▾</button>`;
  html += `<div class="details-panel ${detailsOpen ? 'open' : ''}" id="detailsPanel">
    <div class="details-content">
      <div class="detail-row"><span>Delivery Address</span><span>${ORDER.deliveryAddress}</span></div>
      <div class="detail-row"><span>Courier Partner</span><span>${ORDER.courierPartner}</span></div>
      <div class="detail-row"><span>Contact</span><span>${ORDER.courierPhone}</span></div>
      <div class="detail-row"><span>Estimated</span><span>${ORDER.estimatedDelivery.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
    </div>
  </div>`;

  card.innerHTML = html;

  document.getElementById('detailsToggle').addEventListener('click', () => {
    detailsOpen = !detailsOpen;
    const panel = document.getElementById('detailsPanel');
    const btn = document.getElementById('detailsToggle');
    panel.classList.toggle('open');
    btn.textContent = `${detailsOpen ? 'Hide' : 'Show'} Delivery Details ▾`;
  });
}

function formatTime(date) {
  return date.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// LIVE UPDATES (Simulated Polling)
// ============================================================
function simulateLiveUpdate() {
  if (currentStepIndex < TRACKING_STEPS.length - 1) {
    currentStepIndex++;
    TRACKING_STEPS[currentStepIndex].time = new Date();
    renderAll();
  }
}

// Simulate progression every 8 seconds
setInterval(simulateLiveUpdate, 8000);

// Countdown timer updates every second
setInterval(renderCountdown, 1000);

function renderAll() {
  renderOrder();
  renderCountdown();
  renderTimeline();
}

renderAll();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Got rejected — didn't implement **push notification simulation** and real-time socket mock the interviewer expected
- Vertical timeline stepper: CSS `::before` pseudo-element for the connecting line, dots positioned absolutely
- **Pulsing active dot**: `@keyframes pulse` with inner `::after` pseudo-element — shows "processing"
- Countdown timer: `Date.now() + offset`, calculate hours/minutes/seconds, update every 1s
- Expandable panel: `max-height: 0` → `max-height: 200px` with CSS transition — smooth accordion
- `navigator.clipboard.writeText()` with fallback to `execCommand('copy')` for cross-browser support
- Simulated polling with `setInterval(8000)` — moves to next step automatically
- Progress bar: `elapsed / totalDuration * 100` — visual delivery route progress

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA, Logic |
| Technical 1 | Medium | DOM, CSS |
| Technical 2 | Hard | Timeline, Live Updates, Clipboard |
| Hiring Manager | Medium | E-Commerce, Product Thinking |
