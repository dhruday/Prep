# Ola — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Ola |
| **Role** | Senior Frontend Engineer |
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

## Round 3: Frontend Machine Coding — Interactive Fare Estimator Dashboard

### Problem
Build an interactive fare estimation dashboard with:
1. Route input (pickup → drop) with distance slider
2. Surge pricing multiplier display (1x to 3x with visual indicator)
3. Fare breakdown chart showing base, distance, surge, tax components
4. Multiple ride comparison table (Auto vs Mini vs Sedan vs SUV)
5. Toll/night charge toggle switches
6. Save estimates to local history with timestamp
7. Export fare comparison as formatted text

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Fare Estimator Dashboard</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f8f9fa; padding: 24px; }
h1 { font-size: 22px; color: #1f2937; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
.dashboard { display: grid; grid-template-columns: 340px 1fr; gap: 20px; max-width: 1000px; margin: 0 auto; }

/* Controls Panel */
.controls { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.control-group { margin-bottom: 18px; }
.control-group label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
.control-group input[type="text"] { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
.slider-row { display: flex; align-items: center; gap: 10px; }
.slider-row input[type="range"] { flex: 1; accent-color: #22c55e; }
.slider-val { font-size: 15px; font-weight: 700; color: #22c55e; min-width: 50px; }

/* Surge Indicator */
.surge-indicator { display: flex; align-items: center; gap: 12px; padding: 10px; background: #fef3c7; border-radius: 8px; }
.surge-bar { flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
.surge-fill { height: 100%; border-radius: 4px; transition: width 0.3s, background 0.3s; }
.surge-label { font-size: 18px; font-weight: 700; min-width: 40px; }
.surge-low { background: #22c55e; }
.surge-mid { background: #f59e0b; }
.surge-high { background: #ef4444; }

/* Toggle Switch */
.toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
.toggle-label { font-size: 14px; color: #374151; }
.toggle { position: relative; width: 44px; height: 24px; cursor: pointer; }
.toggle input { display: none; }
.toggle .slider { position: absolute; inset: 0; background: #d1d5db; border-radius: 12px; transition: 0.2s; }
.toggle .slider::before { content: ''; position: absolute; width: 18px; height: 18px; background: #fff; border-radius: 50%; top: 3px; left: 3px; transition: 0.2s; }
.toggle input:checked + .slider { background: #22c55e; }
.toggle input:checked + .slider::before { transform: translateX(20px); }

/* Output Panel */
.output { display: flex; flex-direction: column; gap: 16px; }

/* Comparison Table */
.compare-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.compare-card h3 { font-size: 16px; margin-bottom: 12px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 8px 10px; background: #f9fafb; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
tr.best { background: #f0fdf4; }
.best-badge { display: inline-block; background: #22c55e; color: #fff; font-size: 10px; padding: 1px 6px; border-radius: 4px; margin-left: 4px; }

/* Bar Chart */
.chart-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.chart-card h3 { font-size: 16px; margin-bottom: 12px; }
.bar-chart { display: flex; gap: 8px; align-items: flex-end; height: 160px; padding-bottom: 24px; position: relative; }
.bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; }
.bar { width: 100%; border-radius: 4px 4px 0 0; transition: height 0.3s; position: relative; min-height: 4px; }
.bar-val { font-size: 11px; font-weight: 600; position: absolute; top: -18px; width: 100%; text-align: center; }
.bar-label { font-size: 11px; color: #6b7280; margin-top: 6px; text-align: center; }

/* History */
.history-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.history-card h3 { font-size: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
.history-list { max-height: 180px; overflow-y: auto; }
.history-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
.history-item span:first-child { color: #6b7280; }

/* Actions */
.action-row { display: flex; gap: 8px; }
.btn { padding: 10px 16px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-save { background: #22c55e; color: #fff; }
.btn-export { background: #3b82f6; color: #fff; }
.btn-clear { background: #f3f4f6; color: #6b7280; font-size: 11px; border: none; cursor: pointer; }
</style>
</head>
<body>
<h1>🚕 Ola Fare Estimator</h1>
<div class="dashboard">
  <div class="controls" id="controls"></div>
  <div class="output" id="output"></div>
</div>

<script>
// ============================================================
// STATE
// ============================================================
const RIDES = [
  { type: 'Auto', base: 30, perKm: 12, emoji: '🛺' },
  { type: 'Mini', base: 50, perKm: 15, emoji: '🚗' },
  { type: 'Sedan', base: 80, perKm: 18, emoji: '🚙' },
  { type: 'SUV', base: 120, perKm: 22, emoji: '🚐' }
];

let state = {
  pickup: 'Koramangala',
  dropoff: 'Whitefield',
  distance: 15,
  surge: 1.0,
  tollCharge: false,
  nightCharge: false,
  history: JSON.parse(localStorage.getItem('ola_fare_history') || '[]')
};

const TOLL_AMOUNT = 45;
const NIGHT_MULTIPLIER = 1.15;
const TAX_RATE = 0.05;

// ============================================================
// CALCULATIONS
// ============================================================
function calculateFare(ride) {
  let fare = ride.base + ride.perKm * state.distance;
  const base = fare;
  const surgeAmount = fare * (state.surge - 1);
  fare *= state.surge;
  const toll = state.tollCharge ? TOLL_AMOUNT : 0;
  const nightExtra = state.nightCharge ? fare * (NIGHT_MULTIPLIER - 1) : 0;
  fare += nightExtra;
  const tax = fare * TAX_RATE;
  const total = fare + toll + tax;

  return {
    base: Math.round(base),
    surge: Math.round(surgeAmount),
    toll,
    night: Math.round(nightExtra),
    tax: Math.round(tax),
    total: Math.round(total)
  };
}

// ============================================================
// RENDERING
// ============================================================
function renderControls() {
  const surgeClass = state.surge < 1.5 ? 'surge-low' : state.surge < 2.0 ? 'surge-mid' : 'surge-high';
  const surgePct = ((state.surge - 1) / 2) * 100;

  document.getElementById('controls').innerHTML = `
    <div class="control-group">
      <label>Pickup</label>
      <input type="text" id="pickup" value="${state.pickup}">
    </div>
    <div class="control-group">
      <label>Drop-off</label>
      <input type="text" id="dropoff" value="${state.dropoff}">
    </div>
    <div class="control-group">
      <label>Distance</label>
      <div class="slider-row">
        <input type="range" id="distSlider" min="1" max="50" value="${state.distance}">
        <span class="slider-val">${state.distance} km</span>
      </div>
    </div>
    <div class="control-group">
      <label>Surge Pricing</label>
      <div class="surge-indicator">
        <div class="surge-bar"><div class="surge-fill ${surgeClass}" style="width:${surgePct}%"></div></div>
        <span class="surge-label">${state.surge.toFixed(1)}x</span>
      </div>
      <div class="slider-row" style="margin-top:6px;">
        <input type="range" id="surgeSlider" min="10" max="30" value="${state.surge * 10}" step="1">
      </div>
    </div>
    <div class="control-group">
      <div class="toggle-row">
        <span class="toggle-label">Toll Road (₹${TOLL_AMOUNT})</span>
        <label class="toggle"><input type="checkbox" id="tollToggle" ${state.tollCharge ? 'checked' : ''}><span class="slider"></span></label>
      </div>
      <div class="toggle-row">
        <span class="toggle-label">Night Charge (+15%)</span>
        <label class="toggle"><input type="checkbox" id="nightToggle" ${state.nightCharge ? 'checked' : ''}><span class="slider"></span></label>
      </div>
    </div>
    <div class="action-row">
      <button class="btn btn-save" id="saveBtn">💾 Save Estimate</button>
      <button class="btn btn-export" id="exportBtn">📋 Copy</button>
    </div>
  `;

  // Listeners
  document.getElementById('distance').addEventListener;
  document.getElementById('distSlider').addEventListener('input', e => { state.distance = parseInt(e.target.value); renderAll(); });
  document.getElementById('surgeSlider').addEventListener('input', e => { state.surge = parseInt(e.target.value) / 10; renderAll(); });
  document.getElementById('tollToggle').addEventListener('change', e => { state.tollCharge = e.target.checked; renderAll(); });
  document.getElementById('nightToggle').addEventListener('change', e => { state.nightCharge = e.target.checked; renderAll(); });
  document.getElementById('pickup').addEventListener('change', e => { state.pickup = e.target.value; });
  document.getElementById('dropoff').addEventListener('change', e => { state.dropoff = e.target.value; });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const fares = RIDES.map(r => ({ type: r.type, ...calculateFare(r) }));
    const entry = { pickup: state.pickup, dropoff: state.dropoff, distance: state.distance, surge: state.surge, fares, time: new Date().toLocaleString() };
    state.history.unshift(entry);
    if (state.history.length > 10) state.history.pop();
    localStorage.setItem('ola_fare_history', JSON.stringify(state.history));
    renderOutput();
  });

  document.getElementById('exportBtn').addEventListener('click', () => {
    const lines = [`Fare Estimate: ${state.pickup} → ${state.dropoff} (${state.distance}km, ${state.surge}x surge)\n`];
    RIDES.forEach(r => {
      const f = calculateFare(r);
      lines.push(`${r.emoji} ${r.type}: ₹${f.total} (base ₹${f.base}, surge ₹${f.surge}, tax ₹${f.tax})`);
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      const btn = document.getElementById('exportBtn');
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.textContent = '📋 Copy'; }, 1500);
    });
  });
}

function renderOutput() {
  const fares = RIDES.map(r => ({ ...r, fare: calculateFare(r) }));
  const cheapest = fares.reduce((a, b) => a.fare.total < b.fare.total ? a : b);
  const maxTotal = Math.max(...fares.map(f => f.fare.total));

  // Selected ride for chart (cheapest)
  const chartFare = cheapest.fare;

  document.getElementById('output').innerHTML = `
    <div class="compare-card">
      <h3>Ride Comparison</h3>
      <table>
        <tr><th>Type</th><th>Base</th><th>Surge</th><th>Extras</th><th>Tax</th><th>Total</th></tr>
        ${fares.map(r => `
          <tr class="${r.type === cheapest.type ? 'best' : ''}">
            <td>${r.emoji} ${r.type} ${r.type === cheapest.type ? '<span class="best-badge">BEST</span>' : ''}</td>
            <td>₹${r.fare.base}</td>
            <td>₹${r.fare.surge}</td>
            <td>₹${r.fare.toll + r.fare.night}</td>
            <td>₹${r.fare.tax}</td>
            <td><strong>₹${r.fare.total}</strong></td>
          </tr>
        `).join('')}
      </table>
    </div>

    <div class="chart-card">
      <h3>Fare Breakdown — ${cheapest.emoji} ${cheapest.type}</h3>
      <div class="bar-chart">
        ${[
          { label: 'Base', val: chartFare.base, color: '#22c55e' },
          { label: 'Surge', val: chartFare.surge, color: '#f59e0b' },
          { label: 'Toll', val: chartFare.toll, color: '#8b5cf6' },
          { label: 'Night', val: chartFare.night, color: '#6366f1' },
          { label: 'Tax', val: chartFare.tax, color: '#ef4444' }
        ].map(b => {
          const h = chartFare.total > 0 ? (b.val / chartFare.total * 140) : 0;
          return `<div class="bar-group">
            <div class="bar" style="height:${Math.max(h, 4)}px;background:${b.color};">
              <div class="bar-val">₹${b.val}</div>
            </div>
            <div class="bar-label">${b.label}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="history-card">
      <h3>Saved Estimates <button class="btn-clear" id="clearHistory">Clear</button></h3>
      <div class="history-list">
        ${state.history.length === 0 ? '<div style="color:#9ca3af;font-size:13px;">No saved estimates yet</div>' :
          state.history.map(h => `
            <div class="history-item">
              <span>${h.pickup} → ${h.dropoff} (${h.distance}km)</span>
              <span>${h.time}</span>
            </div>
          `).join('')}
      </div>
    </div>
  `;

  document.getElementById('clearHistory')?.addEventListener('click', () => {
    state.history = [];
    localStorage.removeItem('ola_fare_history');
    renderOutput();
  });
}

function renderAll() {
  renderControls();
  renderOutput();
}

renderAll();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Got rejected — interviewer expected **chart animations** and **responsive mobile layout** which I ran out of time for
- Surge pricing visualization: CSS bar fill width based on surge value, color changes at thresholds (green→amber→red)
- **Toggle switches**: pure CSS with hidden checkbox + `::before` pseudo-element slider
- Bar chart: height proportional to `value / total * maxHeight` — simple but effective visualization
- Comparison table highlights cheapest option with `.best` class and badge
- Export feature: format structured text, copy via `navigator.clipboard.writeText()`
- History capped at 10 entries with `unshift()` + `pop()` — simple LRU-like behavior
- Slider input: `min/max/step` with live value display — immediate visual feedback

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Math |
| Technical 1 | Medium | DOM, Event Handling |
| Technical 2 | Hard | Dashboard, Charts, Interactive Controls |
| Hiring Manager | Medium | Product Sense, Ride-Hailing |
