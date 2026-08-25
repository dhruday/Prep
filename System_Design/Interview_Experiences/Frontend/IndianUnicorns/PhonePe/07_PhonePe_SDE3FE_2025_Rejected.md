# PhonePe — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | PhonePe |
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

## Round 3: Frontend Machine Coding — Expense Analytics Dashboard

### Problem
Build a personal expense analytics dashboard with:
1. Monthly expense summary cards (total, average/day, category breakdown)
2. Donut chart showing category distribution
3. Category-wise bar chart (horizontal bars)
4. Add expense form with category selector
5. Budget threshold: warn when category exceeds budget
6. Month navigator (previous/next month)
7. Export monthly report as text

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Expense Analytics</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f4f0ff; min-height: 100vh; padding: 24px; }

.container { max-width: 720px; margin: 0 auto; }
h1 { font-size: 22px; color: #1e1b4b; margin-bottom: 20px; }

/* Month Nav */
.month-nav { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 20px; }
.month-nav button { width: 36px; height: 36px; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; font-size: 16px; cursor: pointer; }
.month-nav button:hover { background: #f3f4f6; }
.month-label { font-size: 18px; font-weight: 600; color: #1e1b4b; min-width: 160px; text-align: center; }

/* Summary Cards */
.summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.summary-card { background: #fff; border-radius: 10px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center; }
.summary-val { font-size: 24px; font-weight: 700; color: #5f2dab; }
.summary-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

/* Charts */
.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.chart-card { background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.chart-card h3 { font-size: 14px; color: #374151; margin-bottom: 12px; }

/* Donut */
.donut-container { display: flex; align-items: center; justify-content: center; }
canvas#donutChart { width: 160px; height: 160px; }
.donut-legend { margin-left: 16px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 4px; }
.legend-dot { width: 10px; height: 10px; border-radius: 2px; }

/* Bar Chart */
.bar-item { margin-bottom: 10px; }
.bar-label { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
.bar-label span:first-child { color: #374151; font-weight: 500; }
.bar-label span:last-child { color: #6b7280; }
.bar-track { height: 20px; background: #f3f4f6; border-radius: 4px; overflow: hidden; position: relative; }
.bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
.bar-budget { position: absolute; top: 0; bottom: 0; width: 2px; background: #ef4444; z-index: 1; }
.over-budget { font-size: 10px; color: #ef4444; font-weight: 600; }

/* Add Expense */
.add-card { background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 16px; }
.add-card h3 { font-size: 14px; color: #374151; margin-bottom: 12px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 8px; align-items: end; }
.form-field label { display: block; font-size: 11px; color: #6b7280; margin-bottom: 3px; }
.form-field input, .form-field select { width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; }
.add-btn { padding: 8px 16px; background: #5f2dab; color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; height: 36px; }
.add-btn:hover { background: #4c1d95; }

.export-btn { padding: 8px 16px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
</style>
</head>
<body>
<div class="container">
  <h1>📊 Expense Analytics</h1>
  <div class="month-nav" id="monthNav"></div>
  <div class="summary-row" id="summaryRow"></div>
  <div class="charts-row" id="chartsRow"></div>
  <div class="add-card" id="addCard"></div>
</div>

<script>
// ============================================================
// DATA
// ============================================================
const CATEGORIES = [
  { name: 'Food', color: '#f59e0b', budget: 8000 },
  { name: 'Transport', color: '#3b82f6', budget: 5000 },
  { name: 'Shopping', color: '#ec4899', budget: 6000 },
  { name: 'Bills', color: '#10b981', budget: 10000 },
  { name: 'Entertainment', color: '#8b5cf6', budget: 3000 },
  { name: 'Health', color: '#ef4444', budget: 4000 }
];

// Generate sample expenses
const EXPENSES = [];
const now = new Date();
for (let m = -2; m <= 0; m++) {
  const month = new Date(now.getFullYear(), now.getMonth() + m, 1);
  for (let i = 0; i < 25; i++) {
    const day = 1 + Math.floor(Math.random() * 28);
    EXPENSES.push({
      id: Date.now() + Math.random(),
      description: ['Lunch', 'Uber', 'Amazon', 'Electricity', 'Netflix', 'Gym', 'Groceries', 'Coffee', 'Metro', 'Rent'][i % 10],
      amount: Math.round(100 + Math.random() * 3000),
      category: CATEGORIES[i % CATEGORIES.length].name,
      date: new Date(month.getFullYear(), month.getMonth(), day)
    });
  }
}

let currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

// ============================================================
// HELPERS
// ============================================================
function getMonthExpenses() {
  const start = new Date(currentMonth);
  const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  return EXPENSES.filter(e => e.date >= start && e.date <= end);
}

function getCategoryTotals(expenses) {
  const totals = {};
  CATEGORIES.forEach(c => totals[c.name] = 0);
  expenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
  return totals;
}

function formatMonth(date) {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

// ============================================================
// RENDERING
// ============================================================
function renderAll() {
  renderMonthNav();
  renderSummary();
  renderCharts();
  renderAddExpense();
}

function renderMonthNav() {
  document.getElementById('monthNav').innerHTML = `
    <button id="prevMonth">←</button>
    <span class="month-label">${formatMonth(currentMonth)}</span>
    <button id="nextMonth">→</button>
    <button class="export-btn" id="exportBtn">📋 Export</button>
  `;
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    renderAll();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    renderAll();
  });
  document.getElementById('exportBtn').addEventListener('click', exportReport);
}

function renderSummary() {
  const expenses = getMonthExpenses();
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const avgPerDay = total / daysInMonth;

  document.getElementById('summaryRow').innerHTML = `
    <div class="summary-card"><div class="summary-val">₹${total.toLocaleString('en-IN')}</div><div class="summary-label">Total Spent</div></div>
    <div class="summary-card"><div class="summary-val">₹${Math.round(avgPerDay).toLocaleString('en-IN')}</div><div class="summary-label">Avg / Day</div></div>
    <div class="summary-card"><div class="summary-val">${expenses.length}</div><div class="summary-label">Transactions</div></div>
  `;
}

function renderCharts() {
  const expenses = getMonthExpenses();
  const catTotals = getCategoryTotals(expenses);
  const total = Object.values(catTotals).reduce((s, v) => s + v, 0);
  const maxCat = Math.max(...CATEGORIES.map(c => catTotals[c.name]));

  document.getElementById('chartsRow').innerHTML = `
    <div class="chart-card">
      <h3>Category Distribution</h3>
      <div class="donut-container">
        <canvas id="donutChart" width="160" height="160"></canvas>
        <div class="donut-legend">
          ${CATEGORIES.map(c => {
            const pct = total > 0 ? ((catTotals[c.name] / total) * 100).toFixed(0) : 0;
            return `<div class="legend-item"><div class="legend-dot" style="background:${c.color}"></div><span>${c.name} ${pct}%</span></div>`;
          }).join('')}
        </div>
      </div>
    </div>
    <div class="chart-card">
      <h3>Category Breakdown</h3>
      ${CATEGORIES.map(c => {
        const spent = catTotals[c.name];
        const pct = maxCat > 0 ? (spent / maxCat * 100) : 0;
        const budgetPct = maxCat > 0 ? (c.budget / maxCat * 100) : 0;
        const overBudget = spent > c.budget;
        return `<div class="bar-item">
          <div class="bar-label">
            <span>${c.name} ${overBudget ? '<span class="over-budget">⚠ Over budget!</span>' : ''}</span>
            <span>₹${spent.toLocaleString('en-IN')} / ₹${c.budget.toLocaleString('en-IN')}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.min(pct, 100)}%;background:${c.color}"></div>
            <div class="bar-budget" style="left:${Math.min(budgetPct, 100)}%"></div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;

  drawDonut(catTotals, total);
}

function drawDonut(catTotals, total) {
  const canvas = document.getElementById('donutChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = 80, cy = 80, r = 60, lineWidth = 22;

  ctx.clearRect(0, 0, 160, 160);

  if (total === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    return;
  }

  let startAngle = -Math.PI / 2;
  CATEGORIES.forEach(cat => {
    const value = catTotals[cat.name];
    if (value <= 0) return;
    const sliceAngle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
    ctx.strokeStyle = cat.color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'butt';
    ctx.stroke();
    startAngle += sliceAngle;
  });

  // Center text
  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 14px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('₹' + (total / 1000).toFixed(1) + 'K', cx, cy + 5);
}

function renderAddExpense() {
  const card = document.getElementById('addCard');
  card.innerHTML = `
    <h3>➕ Add Expense</h3>
    <div class="form-row">
      <div class="form-field">
        <label>Description</label>
        <input type="text" id="expDesc" placeholder="e.g., Lunch">
      </div>
      <div class="form-field">
        <label>Amount (₹)</label>
        <input type="number" id="expAmt" placeholder="0" min="1">
      </div>
      <div class="form-field">
        <label>Category</label>
        <select id="expCat">
          ${CATEGORIES.map(c => `<option>${c.name}</option>`).join('')}
        </select>
      </div>
      <button class="add-btn" id="addExpBtn">Add</button>
    </div>
  `;

  card.querySelector('#addExpBtn').addEventListener('click', () => {
    const desc = card.querySelector('#expDesc').value.trim();
    const amt = parseFloat(card.querySelector('#expAmt').value);
    const cat = card.querySelector('#expCat').value;
    if (!desc || !amt || amt <= 0) return;

    EXPENSES.push({
      id: Date.now(),
      description: desc,
      amount: Math.round(amt),
      category: cat,
      date: new Date()
    });
    renderAll();
  });
}

function exportReport() {
  const expenses = getMonthExpenses();
  const catTotals = getCategoryTotals(expenses);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const lines = [
    `Expense Report: ${formatMonth(currentMonth)}`,
    `Total: ₹${total.toLocaleString('en-IN')}`,
    '---',
    ...CATEGORIES.map(c =>
      `${c.name}: ₹${catTotals[c.name].toLocaleString('en-IN')} (Budget: ₹${c.budget.toLocaleString('en-IN')})${catTotals[c.name] > c.budget ? ' ⚠ OVER BUDGET' : ''}`
    )
  ];
  navigator.clipboard.writeText(lines.join('\n'));
  const btn = document.getElementById('exportBtn');
  btn.textContent = '✓ Copied!';
  setTimeout(() => btn.textContent = '📋 Export', 1500);
}

renderAll();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Got rejected — interviewed couldn't implement **grouped expenses by date** and **drag to reorder categories**
- **Canvas donut chart**: draw arcs with `ctx.arc()`, each category gets proportional slice angle
- Budget threshold: red line on bar chart at `budget / maxCategory * 100%` position
- Over-budget warning: compare `spent > budget`, show ⚠ badge — important fintech feature
- Month navigation: change `currentMonth` Date object, re-render everything — stateful navigation
- Bar chart: horizontal fills with percentage of max category — relative comparison
- Export: format category totals with budget comparison as clipboard text
- Add expense: push to array + re-render — auto-updates all charts and summaries

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Algorithms |
| Technical 1 | Medium | DOM, CSS Grid |
| Technical 2 | Hard | Canvas Charts, Budget Logic |
| Hiring Manager | Medium | Fintech, Analytics UX |
