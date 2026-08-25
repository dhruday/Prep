# Razorpay — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 3: Frontend Machine Coding — Merchant Dashboard with Analytics

### Problem
Build a merchant analytics dashboard:
1. KPI cards: total revenue, transactions count, success rate, average ticket size
2. Revenue line chart (last 7 days) using Canvas
3. Payment method distribution donut chart
4. Recent transactions table with status badges and search
5. Date range picker to filter data
6. Auto-refresh toggle (polling every 30s)
7. Export dashboard data as CSV

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Merchant Dashboard</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f1f5f9; padding: 20px; }

.dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h1 { font-size: 22px; color: #0f172a; }
.controls { display: flex; gap: 8px; align-items: center; }
.date-input { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
.refresh-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
.toggle-sw { position: relative; width: 36px; height: 20px; cursor: pointer; }
.toggle-sw input { display: none; }
.toggle-sw .sl { position: absolute; inset: 0; background: #cbd5e1; border-radius: 10px; transition: 0.2s; }
.toggle-sw .sl::before { content: ''; position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%; top: 2px; left: 2px; transition: 0.2s; }
.toggle-sw input:checked + .sl { background: #2b84ea; }
.toggle-sw input:checked + .sl::before { transform: translateX(16px); }
.export-btn { padding: 6px 14px; background: #2b84ea; color: #fff; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; }

/* KPI Cards */
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.kpi-card { background: #fff; border-radius: 10px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
.kpi-label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
.kpi-value { font-size: 22px; font-weight: 700; color: #0f172a; }
.kpi-change { font-size: 11px; margin-top: 4px; }
.kpi-up { color: #16a34a; }
.kpi-down { color: #dc2626; }

/* Charts Row */
.charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px; }
.chart-card { background: #fff; border-radius: 10px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
.chart-card h3 { font-size: 14px; color: #334155; margin-bottom: 12px; }
canvas { width: 100%; }

/* Donut Legend */
.donut-wrap { display: flex; align-items: center; gap: 16px; }
.legend { flex: 1; }
.legend-row { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 6px; }
.legend-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }

/* Transactions Table */
.table-card { background: #fff; border-radius: 10px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.table-header h3 { font-size: 14px; color: #334155; }
.search-input { padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; width: 200px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 500; font-size: 11px; text-transform: uppercase; }
td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
.status-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.status-captured { background: #dcfce7; color: #16a34a; }
.status-failed { background: #fee2e2; color: #dc2626; }
.status-refunded { background: #fef3c7; color: #d97706; }
.status-authorized { background: #e0e7ff; color: #4f46e5; }
.live-dot { display: inline-block; width: 6px; height: 6px; background: #16a34a; border-radius: 50%; margin-right: 4px; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
</style>
</head>
<body>
<div class="dashboard-header">
  <h1>📊 Merchant Dashboard</h1>
  <div class="controls">
    <input type="date" class="date-input" id="startDate">
    <span>–</span>
    <input type="date" class="date-input" id="endDate">
    <div class="refresh-toggle">
      <label class="toggle-sw"><input type="checkbox" id="autoRefresh"><span class="sl"></span></label>
      <span id="refreshLabel">Auto-refresh</span>
    </div>
    <button class="export-btn" id="exportBtn">📥 Export CSV</button>
  </div>
</div>
<div class="kpi-row" id="kpiRow"></div>
<div class="charts-row">
  <div class="chart-card"><h3>Revenue (Last 7 Days)</h3><canvas id="lineChart" height="200"></canvas></div>
  <div class="chart-card"><h3>Payment Methods</h3><div class="donut-wrap"><canvas id="donutChart" width="140" height="140"></canvas><div class="legend" id="legend"></div></div></div>
</div>
<div class="table-card" id="tableCard"></div>

<script>
// ============================================================
// DATA GENERATION
// ============================================================
function generateData() {
  const days = 7;
  const revenue = Array.from({ length: days }, () => Math.round(50000 + Math.random() * 200000));
  const transactions = Array.from({ length: 40 }, (_, i) => ({
    id: 'pay_' + Math.random().toString(36).substr(2, 10),
    email: ['user@example.com', 'shop@store.in', 'admin@corp.com', 'test@dev.io'][i % 4],
    amount: Math.round(100 + Math.random() * 10000),
    method: ['card', 'upi', 'netbanking', 'wallet'][i % 4],
    status: ['captured', 'captured', 'captured', 'failed', 'refunded', 'authorized'][i % 6],
    time: new Date(Date.now() - i * 1800000)
  }));

  const methodDist = { card: 42, upi: 31, netbanking: 18, wallet: 9 };
  const totalRev = revenue.reduce((s, v) => s + v, 0);
  const txnCount = transactions.length;
  const successCount = transactions.filter(t => t.status === 'captured').length;
  const successRate = ((successCount / txnCount) * 100).toFixed(1);
  const avgTicket = Math.round(totalRev / txnCount);

  return { revenue, transactions, methodDist, totalRev, txnCount, successRate, avgTicket };
}

let data = generateData();
let searchQuery = '';
let refreshInterval = null;

// ============================================================
// KPI CARDS
// ============================================================
function renderKPIs() {
  const kpis = [
    { label: 'Total Revenue', value: '₹' + (data.totalRev / 100).toLocaleString('en-IN'), change: '+12.5%', up: true },
    { label: 'Transactions', value: data.txnCount, change: '+8 today', up: true },
    { label: 'Success Rate', value: data.successRate + '%', change: data.successRate > 90 ? '+2.1%' : '-1.3%', up: data.successRate > 90 },
    { label: 'Avg Ticket Size', value: '₹' + (data.avgTicket / 100).toFixed(0), change: '+₹15', up: true }
  ];

  document.getElementById('kpiRow').innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-change ${k.up ? 'kpi-up' : 'kpi-down'}">${k.up ? '↑' : '↓'} ${k.change}</div>
    </div>
  `).join('');
}

// ============================================================
// LINE CHART
// ============================================================
function drawLineChart() {
  const canvas = document.getElementById('lineChart');
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth;
  const H = 200;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  const values = data.revenue;
  const max = Math.max(...values) * 1.1;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  // Grid lines
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(W - padding.right, y); ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px -apple-system';
    ctx.textAlign = 'right';
    ctx.fillText('₹' + Math.round((max - (max / 4) * i) / 100).toLocaleString(), padding.left - 6, y + 4);
  }

  // Points and line
  const points = values.map((v, i) => ({
    x: padding.left + (chartW / (values.length - 1)) * i,
    y: padding.top + chartH - (v / max) * chartH
  }));

  // Gradient fill
  const grad = ctx.createLinearGradient(0, padding.top, 0, H - padding.bottom);
  grad.addColorStop(0, 'rgba(43,132,234,0.15)');
  grad.addColorStop(1, 'rgba(43,132,234,0)');
  ctx.beginPath();
  ctx.moveTo(points[0].x, H - padding.bottom);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, H - padding.bottom);
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#2b84ea';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dots & labels
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  points.forEach((p, i) => {
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = '#2b84ea'; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = '#64748b'; ctx.font = '10px -apple-system'; ctx.textAlign = 'center';
    ctx.fillText(labels[i], p.x, H - padding.bottom + 16);
  });
}

// ============================================================
// DONUT CHART
// ============================================================
function drawDonut() {
  const canvas = document.getElementById('donutChart');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 140, 140);

  const methods = [
    { name: 'Card', pct: data.methodDist.card, color: '#2b84ea' },
    { name: 'UPI', pct: data.methodDist.upi, color: '#8b5cf6' },
    { name: 'Netbanking', pct: data.methodDist.netbanking, color: '#f59e0b' },
    { name: 'Wallet', pct: data.methodDist.wallet, color: '#10b981' }
  ];

  const cx = 70, cy = 70, r = 50;
  let startAngle = -Math.PI / 2;

  methods.forEach(m => {
    const slice = (m.pct / 100) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 18;
    ctx.stroke();
    startAngle += slice;
  });

  document.getElementById('legend').innerHTML = methods.map(m =>
    `<div class="legend-row"><div class="legend-dot" style="background:${m.color}"></div>${m.name}: ${m.pct}%</div>`
  ).join('');
}

// ============================================================
// TRANSACTIONS TABLE
// ============================================================
function renderTable() {
  const filtered = data.transactions.filter(t =>
    !searchQuery || t.email.includes(searchQuery) || t.id.includes(searchQuery)
  );

  document.getElementById('tableCard').innerHTML = `
    <div class="table-header">
      <h3><span class="live-dot"></span>Recent Transactions</h3>
      <input class="search-input" id="txnSearch" placeholder="Search by ID or email..." value="${searchQuery}">
    </div>
    <table>
      <tr><th>ID</th><th>Email</th><th>Amount</th><th>Method</th><th>Status</th><th>Time</th></tr>
      ${filtered.slice(0, 10).map(t => `
        <tr>
          <td style="font-family:monospace;font-size:12px;">${t.id}</td>
          <td>${t.email}</td>
          <td>₹${(t.amount / 100).toFixed(2)}</td>
          <td>${t.method}</td>
          <td><span class="status-badge status-${t.status}">${t.status}</span></td>
          <td style="font-size:12px;color:#64748b;">${t.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
        </tr>
      `).join('')}
    </table>
  `;

  document.getElementById('txnSearch').addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase();
    renderTable();
    // Restore focus
    const inp = document.getElementById('txnSearch');
    inp.focus();
    inp.setSelectionRange(searchQuery.length, searchQuery.length);
  });
}

// ============================================================
// AUTO REFRESH & EXPORT
// ============================================================
document.getElementById('autoRefresh').addEventListener('change', e => {
  if (e.target.checked) {
    document.getElementById('refreshLabel').textContent = 'Live';
    refreshInterval = setInterval(() => { data = generateData(); renderAll(); }, 30000);
  } else {
    document.getElementById('refreshLabel').textContent = 'Auto-refresh';
    clearInterval(refreshInterval);
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const header = 'ID,Email,Amount,Method,Status,Time';
  const rows = data.transactions.map(t =>
    `${t.id},${t.email},${(t.amount / 100).toFixed(2)},${t.method},${t.status},${t.time.toISOString()}`
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

function renderAll() {
  renderKPIs();
  drawLineChart();
  drawDonut();
  renderTable();
}

renderAll();
window.addEventListener('resize', drawLineChart);
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Got rejected — interviewer wanted **interactive tooltip on chart hover** and **drill-down on KPI cards**
- **Canvas line chart**: gradient fill under curve, grid lines with Y-axis labels, dot markers
- Donut chart: arc segments with `ctx.arc()` proportional to percentage
- KPI cards with change indicators: `↑ +12.5%` green or `↓ -1.3%` red
- CSV export: `Blob` + `URL.createObjectURL` + programmatic download link click
- Auto-refresh toggle: `setInterval(30000)` for live polling, clear on toggle off
- Live indicator: pulsing green dot with `@keyframes pulse` — realtime feel
- Status badges: per-status CSS classes (captured=green, failed=red, refunded=amber)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Logic, Algorithms |
| Technical 1 | Medium | DOM, CSS Grid |
| Technical 2 | Hard | Canvas Charts, Dashboard, CSV Export |
| Hiring Manager | Medium | Fintech, Merchant Experience |
