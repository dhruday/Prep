# Intuit — Senior Frontend Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Intuit |
| **Role** | Staff Frontend Engineer |
| **Level** | Staff |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected (HM Round) |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | QuickBooks Online |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Craft Demo + 2 Technical + System Design + HM)

---

## Round 1: Craft Demo
**Duration:** 60 minutes

### Challenge
**Build a Responsive Financial Dashboard** (QuickBooks-style)
- Chart: revenue vs expenses line chart (Canvas/SVG)
- Date range picker to filter data
- Summary cards: total revenue, expenses, profit, profit margin
- Responsive: desktop = side-by-side cards + chart; mobile = stacked
- Accessible: screen readers can access chart data via table fallback

### 💡 Financial Dashboard

```javascript
class FinancialDashboard {
  constructor(container) {
    this.container = container;
    this.data = []; // { date, revenue, expenses }
    this.filteredData = [];
    this.dateRange = { start: null, end: null };
    
    this.render();
  }
  
  setData(data) {
    this.data = data.map(d => ({
      ...d,
      date: new Date(d.date)
    }));
    this.filteredData = [...this.data];
    this.update();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="dashboard" role="main" aria-label="Financial Dashboard">
        <header class="dashboard-header">
          <h1>Financial Overview</h1>
          <div class="date-range-picker" role="group" aria-label="Date range filter">
            <label for="start-date">From</label>
            <input type="date" id="start-date">
            <label for="end-date">To</label>
            <input type="date" id="end-date">
            <button class="btn-apply" aria-label="Apply date filter">Apply</button>
            <button class="btn-reset" aria-label="Reset date filter">Reset</button>
          </div>
        </header>
        
        <div class="summary-cards" role="region" aria-label="Financial summary">
          <div class="card" id="card-revenue" aria-live="polite">
            <span class="card-label">Total Revenue</span>
            <span class="card-value">$0</span>
          </div>
          <div class="card" id="card-expenses" aria-live="polite">
            <span class="card-label">Total Expenses</span>
            <span class="card-value">$0</span>
          </div>
          <div class="card" id="card-profit" aria-live="polite">
            <span class="card-label">Net Profit</span>
            <span class="card-value">$0</span>
          </div>
          <div class="card" id="card-margin" aria-live="polite">
            <span class="card-label">Profit Margin</span>
            <span class="card-value">0%</span>
          </div>
        </div>
        
        <div class="chart-section" role="region" aria-label="Revenue vs Expenses chart">
          <canvas id="chart-canvas" width="800" height="400"></canvas>
          <!-- Accessible table fallback for screen readers -->
          <table class="sr-only" id="chart-data-table" aria-label="Monthly financial data">
            <thead><tr><th>Date</th><th>Revenue</th><th>Expenses</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;
    
    this.canvas = this.container.querySelector('#chart-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.attachListeners();
  }
  
  attachListeners() {
    const startInput = this.container.querySelector('#start-date');
    const endInput = this.container.querySelector('#end-date');
    
    this.container.querySelector('.btn-apply').addEventListener('click', () => {
      const start = startInput.value ? new Date(startInput.value) : null;
      const end = endInput.value ? new Date(endInput.value) : null;
      
      this.filterByDate(start, end);
    });
    
    this.container.querySelector('.btn-reset').addEventListener('click', () => {
      startInput.value = '';
      endInput.value = '';
      this.filteredData = [...this.data];
      this.update();
    });
    
    // Responsive canvas sizing
    const resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    resizeObserver.observe(this.container);
  }
  
  filterByDate(start, end) {
    this.filteredData = this.data.filter(d => {
      if (start && d.date < start) return false;
      if (end && d.date > end) return false;
      return true;
    });
    this.update();
  }
  
  update() {
    this.updateCards();
    this.drawChart();
    this.updateAccessibleTable();
  }
  
  updateCards() {
    const totals = this.filteredData.reduce((acc, d) => {
      acc.revenue += d.revenue;
      acc.expenses += d.expenses;
      return acc;
    }, { revenue: 0, expenses: 0 });
    
    const profit = totals.revenue - totals.expenses;
    const margin = totals.revenue > 0 ? ((profit / totals.revenue) * 100) : 0;
    
    const fmt = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0 });
    
    this.container.querySelector('#card-revenue .card-value').textContent = fmt(totals.revenue);
    this.container.querySelector('#card-expenses .card-value').textContent = fmt(totals.expenses);
    this.container.querySelector('#card-profit .card-value').textContent = fmt(profit);
    this.container.querySelector('#card-profit .card-value').className = 
      `card-value ${profit >= 0 ? 'positive' : 'negative'}`;
    this.container.querySelector('#card-margin .card-value').textContent = margin.toFixed(1) + '%';
  }
  
  drawChart() {
    const canvas = this.canvas;
    const ctx = this.ctx;
    const data = this.filteredData;
    
    if (data.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data for selected range', canvas.width / 2, canvas.height / 2);
      return;
    }
    
    const padding = { top: 40, right: 30, bottom: 60, left: 80 };
    const w = canvas.width - padding.left - padding.right;
    const h = canvas.height - padding.top - padding.bottom;
    
    // Scale
    const maxVal = Math.max(...data.flatMap(d => [d.revenue, d.expenses]));
    const yScale = h / (maxVal * 1.1); // 10% headroom
    const xStep = w / Math.max(data.length - 1, 1);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid lines + Y labels
    ctx.strokeStyle = '#e0e0e0';
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const val = (maxVal * 1.1 / gridLines) * i;
      const y = padding.top + h - (val * yScale);
      
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + w, y);
      ctx.stroke();
      
      ctx.fillText('$' + Math.round(val).toLocaleString(), padding.left - 10, y + 4);
    }
    
    // Draw lines
    const drawLine = (key, color) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      
      data.forEach((d, i) => {
        const x = padding.left + i * xStep;
        const y = padding.top + h - (d[key] * yScale);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      
      ctx.stroke();
      
      // Data points
      data.forEach((d, i) => {
        const x = padding.left + i * xStep;
        const y = padding.top + h - (d[key] * yScale);
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    };
    
    drawLine('revenue', '#2196F3');
    drawLine('expenses', '#F44336');
    
    // X axis labels (dates)
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.font = '11px sans-serif';
    
    const labelEvery = Math.ceil(data.length / 12); // Max 12 labels
    data.forEach((d, i) => {
      if (i % labelEvery === 0) {
        const x = padding.left + i * xStep;
        const label = d.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        ctx.fillText(label, x, padding.top + h + 20);
      }
    });
    
    // Legend
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(padding.left, 10, 12, 12);
    ctx.fillText('Revenue', padding.left + 18, 20);
    ctx.fillStyle = '#F44336';
    ctx.fillRect(padding.left + 100, 10, 12, 12);
    ctx.fillText('Expenses', padding.left + 118, 20);
  }
  
  resizeCanvas() {
    const rect = this.container.querySelector('.chart-section').getBoundingClientRect();
    this.canvas.width = Math.min(rect.width - 20, 1200);
    this.canvas.height = Math.max(300, this.canvas.width * 0.5);
    this.drawChart();
  }
  
  updateAccessibleTable() {
    const tbody = this.container.querySelector('#chart-data-table tbody');
    
    tbody.innerHTML = this.filteredData.map(d => `
      <tr>
        <td>${d.date.toLocaleDateString()}</td>
        <td>$${d.revenue.toLocaleString()}</td>
        <td>$${d.expenses.toLocaleString()}</td>
      </tr>
    `).join('');
  }
}
```

### CSS (responsive)
```css
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 20px 0;
}
@media (max-width: 768px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  .date-range-picker {
    flex-direction: column;
    gap: 8px;
  }
}
@media (max-width: 480px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }
}
.card { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.card-value { font-size: 1.5rem; font-weight: 700; }
.card-value.positive { color: #4caf50; }
.card-value.negative { color: #f44336; }
.sr-only { position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0; }
```

---

## 🎯 Key Takeaways
- Intuit Craft Demo = **Canvas chart + responsive + accessible fallback + financial calculations**
- **Canvas line chart**: manual axis, grid lines, data points — show you can build without D3/Chart.js
- **Accessible chart fallback**: hidden `<table>` with `sr-only` class — screen readers can access chart data
- **Responsive**: CSS Grid `repeat(4, 1fr)` → `repeat(2, 1fr)` → `1fr` at breakpoints
- **Date filtering**: simple `filter()` — don't over-engineer simple data transformations
- **ResizeObserver**: auto-resize canvas on container resize — better than `window.onresize`
- **Legend + grid lines**: professional chart appearance — attention to detail matters in Craft Demos
- Intuit Craft Demo rejection reason: **HM round culture fit** — technical rounds were strong

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Craft Demo | Hard | Canvas Chart, Responsive, A11y |
| Technical 1 | Medium-Hard | JS, React Performance |
| Technical 2 | Medium-Hard | System Design (Frontend) |
| System Design | Hard | Dashboard Architecture |
| HM | Medium | Culture Fit, Leadership |
