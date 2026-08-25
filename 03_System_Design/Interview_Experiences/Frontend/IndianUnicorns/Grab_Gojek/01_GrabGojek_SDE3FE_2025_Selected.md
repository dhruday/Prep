# Grab/Gojek — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Grab/Gojek |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + System Design + Hiring Manager)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 2: Frontend Machine Coding — Real-Time Ride Tracking Map

### Problem
Build a real-time ride tracking interface:
1. Map display area showing a driver car icon and route polyline
2. Animated driver movement along the route (simulated WebSocket updates)
3. ETA countdown with live updates
4. Driver info card (name, car, rating, plate number)
5. Trip status bar: Arriving ➜ In Ride ➜ Dropping Off ➜ Arrived
6. Cancel ride button (only during "Arriving" phase)
7. SOS emergency button always visible

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Ride Tracking</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f8fafc; height: 100vh; display: flex; flex-direction: column; }

/* Map Area */
.map-area { flex: 1; background: #e0f2fe; position: relative; overflow: hidden; }
.map-grid { position: absolute; inset: 0; background-image:
  linear-gradient(rgba(148,163,184,.15) 1px, transparent 1px),
  linear-gradient(90deg, rgba(148,163,184,.15) 1px, transparent 1px);
  background-size: 40px 40px;
}
.route-path { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.car-icon { position: absolute; width: 36px; height: 36px; background: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #fff; box-shadow: 0 2px 10px rgba(37,99,235,.4); transition: left 1s ease, top 1s ease; z-index: 10; }
.pickup-pin, .drop-pin { position: absolute; font-size: 28px; z-index: 5; }
.sos-btn { position: absolute; top: 12px; right: 12px; padding: 8px 16px; background: #dc2626; color: #fff; border: none; border-radius: 20px; font-size: 13px; font-weight: 700; cursor: pointer; z-index: 20; box-shadow: 0 2px 8px rgba(220,38,38,.4); animation: sosPulse 2s infinite; }
@keyframes sosPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,.4); } 50% { box-shadow: 0 0 0 8px rgba(220,38,38,0); } }

/* Bottom Card */
.bottom-card { background: #fff; border-radius: 16px 16px 0 0; padding: 16px 20px 24px; box-shadow: 0 -4px 20px rgba(0,0,0,.08); }

/* Status Bar */
.status-bar { display: flex; gap: 4px; margin-bottom: 14px; }
.status-step { flex: 1; text-align: center; padding: 6px 0; border-radius: 6px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #94a3b8; transition: all 0.3s; }
.status-step.active { background: #2563eb; color: #fff; }
.status-step.done { background: #dcfce7; color: #16a34a; }

/* ETA */
.eta-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.eta-label { font-size: 13px; color: #64748b; }
.eta-value { font-size: 20px; font-weight: 700; color: #0f172a; }
.eta-dist { font-size: 12px; color: #94a3b8; }

/* Driver Card */
.driver-card { display: flex; gap: 12px; align-items: center; padding: 12px; background: #f8fafc; border-radius: 10px; margin-bottom: 14px; }
.driver-avatar { width: 44px; height: 44px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.driver-info { flex: 1; }
.driver-name { font-size: 14px; font-weight: 600; color: #0f172a; }
.driver-meta { font-size: 12px; color: #64748b; margin-top: 2px; }
.driver-rating { font-size: 12px; color: #f59e0b; }
.plate-badge { padding: 4px 10px; background: #0f172a; color: #fff; border-radius: 4px; font-size: 12px; font-weight: 700; letter-spacing: 1px; }

/* Actions */
.action-row { display: flex; gap: 8px; }
.cancel-btn { flex: 1; padding: 10px; background: #fee2e2; color: #dc2626; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.cancel-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.call-btn { width: 44px; height: 44px; background: #dcfce7; border: none; border-radius: 50%; font-size: 18px; cursor: pointer; }
.share-btn { width: 44px; height: 44px; background: #e0e7ff; border: none; border-radius: 50%; font-size: 18px; cursor: pointer; }
</style>
</head>
<body>

<div class="map-area" id="mapArea">
  <div class="map-grid"></div>
  <svg class="route-path" id="routeSvg"></svg>
  <div class="car-icon" id="carIcon">🚗</div>
  <div class="pickup-pin" id="pickupPin">📍</div>
  <div class="drop-pin" id="dropPin">🏁</div>
  <button class="sos-btn" onclick="triggerSOS()">🆘 SOS</button>
</div>

<div class="bottom-card">
  <div class="status-bar" id="statusBar"></div>
  <div class="eta-row">
    <div>
      <div class="eta-label" id="etaLabel">Driver is arriving</div>
      <div class="eta-value" id="etaValue">5 min</div>
    </div>
    <div class="eta-dist" id="etaDist">2.3 km away</div>
  </div>
  <div class="driver-card">
    <div class="driver-avatar">👤</div>
    <div class="driver-info">
      <div class="driver-name">Rahul Sharma</div>
      <div class="driver-meta">Honda City · White</div>
      <div class="driver-rating">⭐ 4.8 (1,245 trips)</div>
    </div>
    <div class="plate-badge">KA 05 MN 4321</div>
  </div>
  <div class="action-row">
    <button class="cancel-btn" id="cancelBtn">Cancel Ride</button>
    <button class="call-btn" title="Call Driver">📞</button>
    <button class="share-btn" title="Share Ride">📤</button>
  </div>
</div>

<script>
// ============================================================
// ROUTE & SIMULATION
// ============================================================
const STATUSES = ['Arriving', 'In Ride', 'Dropping Off', 'Arrived'];
let currentStatus = 0;
let routeProgress = 0;
let etaSeconds = 300; // 5 min initial

// Polyline route points (simulated on map area)
const route = [];
const mapArea = document.getElementById('mapArea');

function generateRoute() {
  const w = mapArea.offsetWidth;
  const h = mapArea.offsetHeight;
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    route.push({
      x: 40 + ((w - 80) / steps) * i,
      y: h * 0.3 + Math.sin(i * 0.5) * (h * 0.2) + (Math.random() - 0.5) * 20
    });
  }
}

function renderRoute() {
  const svg = document.getElementById('routeSvg');
  const d = route.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  svg.innerHTML = `<path d="${d}" fill="none" stroke="#2563eb" stroke-width="3" stroke-dasharray="8,4" opacity="0.6"/>`;

  // Pickup & drop pins
  document.getElementById('pickupPin').style.cssText = `left:${route[0].x - 14}px; top:${route[0].y - 30}px;`;
  document.getElementById('dropPin').style.cssText = `left:${route[route.length - 1].x - 14}px; top:${route[route.length - 1].y - 30}px;`;
}

function updateCarPosition() {
  const idx = Math.min(Math.floor(routeProgress * (route.length - 1)), route.length - 1);
  const p = route[idx];
  const car = document.getElementById('carIcon');
  car.style.left = (p.x - 18) + 'px';
  car.style.top = (p.y - 18) + 'px';
}

// ============================================================
// STATUS RENDERING
// ============================================================
function renderStatusBar() {
  document.getElementById('statusBar').innerHTML = STATUSES.map((s, i) => {
    const cls = i < currentStatus ? 'done' : i === currentStatus ? 'active' : '';
    return `<div class="status-step ${cls}">${i < currentStatus ? '✓ ' : ''}${s}</div>`;
  }).join('');
}

function updateETA() {
  if (etaSeconds <= 0) return;
  const min = Math.floor(etaSeconds / 60);
  const sec = etaSeconds % 60;
  document.getElementById('etaValue').textContent = min > 0 ? `${min} min ${sec}s` : `${sec}s`;

  const distKm = (etaSeconds / 300 * 2.3).toFixed(1);
  document.getElementById('etaDist').textContent = `${distKm} km away`;

  const labels = ['Driver is arriving', 'You\'re on your way', 'Approaching drop-off', 'You have arrived! 🎉'];
  document.getElementById('etaLabel').textContent = labels[currentStatus] || labels[0];
}

function updateCancelButton() {
  const btn = document.getElementById('cancelBtn');
  btn.disabled = currentStatus !== 0;
  btn.textContent = currentStatus === 0 ? 'Cancel Ride' : currentStatus >= 3 ? 'Rate Ride ⭐' : 'Cancel Ride';
}

// ============================================================
// SIMULATION LOOP
// ============================================================
function simulationTick() {
  // Progress route
  routeProgress = Math.min(routeProgress + 0.015, 1);
  updateCarPosition();

  // Decrease ETA
  etaSeconds = Math.max(0, etaSeconds - 3);
  updateETA();

  // Status transitions
  if (routeProgress > 0.25 && currentStatus === 0) {
    currentStatus = 1;
    renderStatusBar();
    updateCancelButton();
  } else if (routeProgress > 0.75 && currentStatus === 1) {
    currentStatus = 2;
    renderStatusBar();
    updateCancelButton();
  } else if (routeProgress >= 1 && currentStatus === 2) {
    currentStatus = 3;
    etaSeconds = 0;
    renderStatusBar();
    updateETA();
    updateCancelButton();
    clearInterval(simInterval);
  }
}

let simInterval;

function startSimulation() {
  generateRoute();
  renderRoute();
  updateCarPosition();
  renderStatusBar();
  updateETA();
  updateCancelButton();
  simInterval = setInterval(simulationTick, 1000);
}

// ============================================================
// ACTIONS
// ============================================================
document.getElementById('cancelBtn').addEventListener('click', () => {
  if (currentStatus === 0) {
    if (confirm('Are you sure you want to cancel the ride?')) {
      clearInterval(simInterval);
      document.getElementById('etaLabel').textContent = 'Ride cancelled';
      document.getElementById('etaValue').textContent = '—';
      document.getElementById('cancelBtn').disabled = true;
    }
  } else if (currentStatus >= 3) {
    alert('Rating submitted! ⭐⭐⭐⭐⭐');
  }
});

function triggerSOS() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(220,38,38,.9);z-index:1000;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#fff;';
  overlay.innerHTML = `
    <div style="font-size:48px;margin-bottom:16px;">🆘</div>
    <div style="font-size:18px;font-weight:700;margin-bottom:8px;">Emergency SOS Activated</div>
    <div style="font-size:14px;opacity:.8;margin-bottom:20px;">Contacting emergency services...</div>
    <button onclick="this.parentElement.remove()" style="padding:8px 24px;background:#fff;color:#dc2626;border:none;border-radius:8px;font-weight:600;cursor:pointer;">I'm Safe — Cancel</button>
  `;
  document.body.appendChild(overlay);
}

startSimulation();
window.addEventListener('resize', () => {
  route.length = 0;
  generateRoute();
  renderRoute();
  updateCarPosition();
});
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Simulated map with CSS grid background and SVG polyline route
- Car icon animates along polyline with `transition: left 1s, top 1s`
- Status bar progression: done (green ✓), active (blue), upcoming (gray)
- Cancel button disabled once ride status passes "Arriving"
- SOS overlay: full-screen red overlay with emergency button, always accessible
- ETA countdown with distance estimation proportional to remaining time
- Driver info card with plate number, car details, rating

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Logic, Algorithms |
| Technical 1 | Medium-Hard | SVG, Animation, DOM |
| Technical 2 | Hard | Real-Time Simulation, State Management |
| System Design | Hard | Ride Matching, Geo-indexing |
| Hiring Manager | Medium | Super-app, Growth |
