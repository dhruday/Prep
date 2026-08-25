# Grab/Gojek — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Grab/Gojek |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 2.5 weeks
- **Format:** Virtual

## Round 2: Frontend Machine Coding — Driver Earnings Dashboard

### Problem
Build a **driver earnings dashboard** (45 min):
1. Daily/weekly/monthly toggle tabs for earnings view
2. Earnings bar chart (horizontal bars per day of current period)
3. Tips vs base fare breakdown (stacked bar chart)
4. Peak hours heatmap (7×24 grid: days × hours, color = earnings intensity)
5. Withdrawal history list with status badges (pending/completed/failed)
6. Target progress ring (earned vs goal)
7. Pure HTML/CSS/JS — no frameworks

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Driver Earnings Dashboard</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background:#0f1923; color:#e0e6ed; padding:16px; }
  .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
  .header h1 { font-size:1.4rem; color:#00b14f; }
  .tabs { display:flex; gap:4px; }
  .tab { padding:8px 16px; border:none; border-radius:20px; cursor:pointer;
         background:#1a2a3a; color:#8899aa; font-size:0.85rem; transition:all 0.2s; }
  .tab.active { background:#00b14f; color:#fff; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .card { background:#1a2a3a; border-radius:12px; padding:16px; }
  .card-title { font-size:0.8rem; color:#6b7c8d; text-transform:uppercase;
                letter-spacing:0.5px; margin-bottom:12px; }

  /* Target ring */
  .ring-wrap { display:flex; align-items:center; gap:20px; }
  .ring-svg { width:120px; height:120px; }
  .ring-bg { fill:none; stroke:#2a3a4a; stroke-width:10; }
  .ring-fg { fill:none; stroke:#00b14f; stroke-width:10; stroke-linecap:round;
             transition:stroke-dashoffset 0.6s ease; }
  .ring-text { font-size:1.6rem; font-weight:700; color:#fff; }
  .ring-label { font-size:0.8rem; color:#6b7c8d; }

  /* Bar chart */
  .bar-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
  .bar-label { width:36px; font-size:0.75rem; color:#6b7c8d; text-align:right; }
  .bar-track { flex:1; height:20px; background:#0f1923; border-radius:4px;
               display:flex; overflow:hidden; }
  .bar-base { background:#00b14f; height:100%; transition:width 0.4s; }
  .bar-tips { background:#00d4aa; height:100%; transition:width 0.4s; }
  .bar-amount { width:60px; font-size:0.75rem; text-align:right; }

  /* Heatmap */
  .heatmap { display:grid; grid-template-columns:40px repeat(24, 1fr); gap:2px; }
  .hm-label { font-size:0.6rem; color:#6b7c8d; display:flex; align-items:center; }
  .hm-cell { aspect-ratio:1; border-radius:2px; position:relative; cursor:pointer;
             transition:transform 0.15s; }
  .hm-cell:hover { transform:scale(1.4); z-index:2; }
  .hm-header { font-size:0.55rem; color:#4a5a6a; text-align:center; }

  /* Withdrawal list */
  .withdrawal { display:flex; justify-content:space-between; align-items:center;
                padding:10px 0; border-bottom:1px solid #2a3a4a; }
  .withdrawal:last-child { border:none; }
  .wd-info { font-size:0.85rem; }
  .wd-date { font-size:0.7rem; color:#6b7c8d; margin-top:2px; }
  .badge { padding:3px 10px; border-radius:12px; font-size:0.7rem; font-weight:600; }
  .badge-completed { background:#0a3d1f; color:#00b14f; }
  .badge-pending { background:#3d3a0a; color:#d4c800; }
  .badge-failed { background:#3d0a0a; color:#ff4444; }

  .full-width { grid-column:1/-1; }
  .legend { display:flex; gap:16px; margin-top:8px; }
  .legend-item { display:flex; align-items:center; gap:4px; font-size:0.7rem; color:#6b7c8d; }
  .legend-dot { width:10px; height:10px; border-radius:2px; }
</style>
</head>
<body>

<div class="header">
  <h1>💰 Earnings Dashboard</h1>
  <div class="tabs" id="periodTabs"></div>
</div>

<div class="grid">
  <div class="card">
    <div class="card-title">Earnings Goal</div>
    <div class="ring-wrap">
      <svg class="ring-svg" viewBox="0 0 120 120">
        <circle class="ring-bg" cx="60" cy="60" r="50"/>
        <circle class="ring-fg" id="ringFg" cx="60" cy="60" r="50"
                stroke-dasharray="314" stroke-dashoffset="314"
                transform="rotate(-90 60 60)"/>
      </svg>
      <div>
        <div class="ring-text" id="earnedText">₹0</div>
        <div class="ring-label" id="goalLabel">of ₹0 goal</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Recent Withdrawals</div>
    <div id="withdrawals"></div>
  </div>

  <div class="card full-width">
    <div class="card-title">Earnings Breakdown</div>
    <div id="barChart"></div>
    <div class="legend">
      <div class="legend-item"><div class="legend-dot" style="background:#00b14f"></div>Base Fare</div>
      <div class="legend-item"><div class="legend-dot" style="background:#00d4aa"></div>Tips</div>
    </div>
  </div>

  <div class="card full-width">
    <div class="card-title">Peak Hours Heatmap (Earnings by Hour)</div>
    <div class="heatmap" id="heatmap"></div>
  </div>
</div>

<script>
// ═══════════════════════════════════════
// DATA
// ═══════════════════════════════════════
const DATA = {
  daily: {
    goal: 2000,
    labels: ['6am','8am','10am','12pm','2pm','4pm','6pm','8pm','10pm'],
    base:  [80, 140, 120, 200, 160, 180, 220, 190, 110],
    tips:  [10, 25, 15, 40, 20, 30, 45, 35, 15],
  },
  weekly: {
    goal: 12000,
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    base:  [1200, 1000, 1300, 1100, 1500, 1800, 1600],
    tips:  [200, 150, 220, 180, 300, 400, 350],
  },
  monthly: {
    goal: 50000,
    labels: ['Wk1','Wk2','Wk3','Wk4'],
    base:  [9500, 10500, 11000, 9000],
    tips:  [1500, 1800, 2000, 1200],
  }
};

const WITHDRAWALS = [
  { amount: 5000, date: '2025-04-18', status: 'completed' },
  { amount: 3000, date: '2025-04-20', status: 'completed' },
  { amount: 2000, date: '2025-04-22', status: 'pending' },
  { amount: 1500, date: '2025-04-23', status: 'failed' },
];

// Heatmap: 7 days × 24 hours (random earnings data)
const HEATMAP_DATA = [];
const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
for (let d = 0; d < 7; d++) {
  HEATMAP_DATA[d] = [];
  for (let h = 0; h < 24; h++) {
    const isPeak = (h >= 7 && h <= 10) || (h >= 17 && h <= 21);
    const isWeekend = d >= 5;
    let base = isPeak ? 150 + Math.random() * 200 : Math.random() * 80;
    if (isWeekend) base *= 1.4;
    if (h < 5) base = Math.random() * 20;
    HEATMAP_DATA[d][h] = Math.round(base);
  }
}

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let currentPeriod = 'weekly';

// ═══════════════════════════════════════
// RENDER
// ═══════════════════════════════════════
function renderTabs() {
  const container = document.getElementById('periodTabs');
  container.innerHTML = '';
  ['daily', 'weekly', 'monthly'].forEach(period => {
    const btn = document.createElement('button');
    btn.className = 'tab' + (period === currentPeriod ? ' active' : '');
    btn.textContent = period.charAt(0).toUpperCase() + period.slice(1);
    btn.onclick = () => { currentPeriod = period; renderAll(); };
    container.appendChild(btn);
  });
}

function renderRing() {
  const data = DATA[currentPeriod];
  const earned = data.base.reduce((a, b) => a + b, 0) + data.tips.reduce((a, b) => a + b, 0);
  const pct = Math.min(1, earned / data.goal);
  const circumference = 314;
  const offset = circumference * (1 - pct);

  document.getElementById('ringFg').setAttribute('stroke-dashoffset', offset);
  document.getElementById('earnedText').textContent = '₹' + earned.toLocaleString();
  document.getElementById('goalLabel').textContent = `of ₹${data.goal.toLocaleString()} goal (${Math.round(pct * 100)}%)`;
}

function renderBarChart() {
  const data = DATA[currentPeriod];
  const maxVal = Math.max(...data.base.map((b, i) => b + data.tips[i]));
  const container = document.getElementById('barChart');
  container.innerHTML = '';

  data.labels.forEach((label, i) => {
    const total = data.base[i] + data.tips[i];
    const basePct = (data.base[i] / maxVal * 100).toFixed(1);
    const tipsPct = (data.tips[i] / maxVal * 100).toFixed(1);

    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <span class="bar-label">${label}</span>
      <div class="bar-track">
        <div class="bar-base" style="width:${basePct}%"></div>
        <div class="bar-tips" style="width:${tipsPct}%"></div>
      </div>
      <span class="bar-amount">₹${total.toLocaleString()}</span>
    `;
    container.appendChild(row);
  });
}

function renderHeatmap() {
  const container = document.getElementById('heatmap');
  container.innerHTML = '';

  // Max value for color scale
  const allVals = HEATMAP_DATA.flat();
  const maxVal = Math.max(...allVals);

  // Hour headers
  const corner = document.createElement('div');
  container.appendChild(corner);
  for (let h = 0; h < 24; h++) {
    const hdr = document.createElement('div');
    hdr.className = 'hm-header';
    hdr.textContent = h % 3 === 0 ? h + ':00' : '';
    container.appendChild(hdr);
  }

  // Rows
  days.forEach((day, d) => {
    const label = document.createElement('div');
    label.className = 'hm-label';
    label.textContent = day;
    container.appendChild(label);

    for (let h = 0; h < 24; h++) {
      const val = HEATMAP_DATA[d][h];
      const intensity = val / maxVal;
      const cell = document.createElement('div');
      cell.className = 'hm-cell';

      // Green gradient: 0=dark, 1=bright green
      const r = Math.round(10 + intensity * 0);
      const g = Math.round(30 + intensity * 177);
      const b2 = Math.round(20 + intensity * 59);
      cell.style.background = `rgb(${r},${g},${b2})`;
      cell.title = `${day} ${h}:00 — ₹${val}`;
      container.appendChild(cell);
    }
  });
}

function renderWithdrawals() {
  const container = document.getElementById('withdrawals');
  container.innerHTML = '';
  WITHDRAWALS.forEach(w => {
    const div = document.createElement('div');
    div.className = 'withdrawal';
    div.innerHTML = `
      <div>
        <div class="wd-info">₹${w.amount.toLocaleString()}</div>
        <div class="wd-date">${w.date}</div>
      </div>
      <span class="badge badge-${w.status}">${w.status}</span>
    `;
    container.appendChild(div);
  });
}

function renderAll() {
  renderTabs();
  renderRing();
  renderBarChart();
  renderHeatmap();
  renderWithdrawals();
}

renderAll();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Got rejected — didn't implement **real-time earnings ticker** (WebSocket simulation) as bonus
- **SVG progress ring**: `stroke-dasharray` = circumference, `stroke-dashoffset` = remaining gap
- **Stacked bars**: two `div` children in flex container, each width proportional to max
- **Heatmap**: CSS Grid 7×24 with dynamic `rgb()` color interpolation from value/maxValue intensity
- **Status badges**: semantic color coding (green/yellow/red) with matching subtle backgrounds
- **Period toggle**: re-renders all components from data object keyed by period name

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Algorithms |
| Technical 1 | Hard | SVG Charts, Heatmap, Responsive Grid |
| Technical 2 | Medium | State Management, Data Viz |
| Hiring Manager | Medium | Driver Experience, Super-App |
