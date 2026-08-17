# Intuit — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Intuit |
| **Role** | Senior Frontend Engineer |
| **Level** | Staff |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Glassdoor](https://www.glassdoor.com/Interview/Intuit-Interview-Questions-E2293.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Craft Demo + Technical 1 + Technical 2 + HM)

---

## Round 1: Craft Demo (Take-Home)
**Duration:** 1 week (presented in 60 min)

### Challenge: Build a Personal Finance Transaction Categorizer
- Paste bank statement text (CSV or freeform)
- Auto-categorize transactions using keyword matching
- Allow manual re-categorization with drag-and-drop
- Display monthly summary charts (bar chart by month, donut by category)
- Export categorized data as CSV

```javascript
/**
 * Transaction Categorizer:
 * - Parse CSV/freeform bank statement
 * - Auto-categorize via keyword → category rules
 * - Drag-and-drop re-categorization
 * - Monthly bar chart + category donut chart
 * - CSV export
 */
class TransactionCategorizer {
  constructor(container) {
    this.container = container;
    this.transactions = [];
    this.view = 'input'; // 'input' | 'table' | 'charts'
    
    // Categorization rules: keyword → category
    this.rules = {
      'swiggy|zomato|uber eats|dominos|pizza|restaurant|cafe|food': 'Food & Dining',
      'uber|ola|metro|fuel|petrol|diesel|parking': 'Transport',
      'amazon|flipkart|myntra|ajio|shopping': 'Shopping',
      'netflix|spotify|hotstar|prime|movie|game': 'Entertainment',
      'rent|emi|loan|insurance|premium': 'Bills & EMIs',
      'salary|credit|refund|cashback|interest': 'Income',
      'electricity|water|gas|broadband|mobile|recharge': 'Utilities',
      'hospital|doctor|pharmacy|medicine|health': 'Healthcare',
    };
    
    // Compile rules to regex for perf
    this.compiledRules = Object.entries(this.rules).map(([pattern, category]) => ({
      regex: new RegExp(pattern, 'i'),
      category
    }));
    
    this.render();
  }
  
  /**
   * Parse CSV text to transactions.
   * Expected: Date, Description, Amount (credit negative, debit positive)
   * Also handles freeform formats with regex extraction.
   */
  parseStatements(text) {
    const lines = text.trim().split('\n').filter(l => l.trim());
    this.transactions = [];
    
    for (const line of lines) {
      // Try CSV first: date, description, amount
      const csvMatch = line.match(/^([^,]+),\s*([^,]+),\s*([+-]?\d[\d,]*\.?\d*)$/);
      
      if (csvMatch) {
        const [, dateStr, description, amountStr] = csvMatch;
        const amount = parseFloat(amountStr.replace(/,/g, ''));
        
        this.transactions.push({
          id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
          date: this.parseDate(dateStr.trim()),
          description: description.trim(),
          amount,
          type: amount >= 0 ? 'debit' : 'credit',
          category: this.categorize(description),
          manualCategory: false
        });
      } else {
        // Freeform: try to extract date, text, amount
        const freeMatch = line.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})?\s*(.+?)\s+([+-]?[\d,]+\.?\d*)\s*$/);
        if (freeMatch) {
          const [, dateStr, description, amountStr] = freeMatch;
          const amount = parseFloat(amountStr.replace(/,/g, ''));
          
          this.transactions.push({
            id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
            date: dateStr ? this.parseDate(dateStr) : new Date().toISOString().slice(0, 10),
            description: description.trim(),
            amount: Math.abs(amount),
            type: amount < 0 || description.toLowerCase().includes('credit') ? 'credit' : 'debit',
            category: this.categorize(description),
            manualCategory: false
          });
        }
      }
    }
    
    this.view = 'table';
    this.render();
  }
  
  parseDate(str) {
    // Handle DD/MM/YYYY, DD-MM-YYYY, etc.
    const parts = str.split(/[/-]/);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const year = y.length === 2 ? '20' + y : y;
      return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return str;
  }
  
  /**
   * Auto-categorize using keyword matching.
   * Returns first matching category or 'Uncategorized'.
   */
  categorize(description) {
    for (const rule of this.compiledRules) {
      if (rule.regex.test(description)) {
        return rule.category;
      }
    }
    return 'Uncategorized';
  }
  
  reCategorizeTxn(txnId, newCategory) {
    const txn = this.transactions.find(t => t.id === txnId);
    if (txn) {
      txn.category = newCategory;
      txn.manualCategory = true;
      this.render();
    }
  }
  
  getMonthlyData() {
    const months = {};
    for (const txn of this.transactions) {
      if (txn.type !== 'debit') continue;
      const month = txn.date.slice(0, 7); // YYYY-MM
      months[month] = (months[month] || 0) + txn.amount;
    }
    return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0]));
  }
  
  getCategoryData() {
    const cats = {};
    for (const txn of this.transactions) {
      if (txn.type !== 'debit') continue;
      cats[txn.category] = (cats[txn.category] || 0) + txn.amount;
    }
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }
  
  exportCSV() {
    const header = 'Date,Description,Amount,Type,Category';
    const rows = this.transactions.map(t =>
      `${t.date},${this.csvEscape(t.description)},${t.amount},${t.type},${t.category}`
    );
    const csv = [header, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'categorized_transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
  
  csvEscape(str) {
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
  
  render() {
    this.container.innerHTML = `
      <div class="categorizer" style="font-family:-apple-system,sans-serif; max-width:900px; margin:0 auto; padding:16px">
        <h1 style="margin:0 0 16px">Transaction Categorizer</h1>
        
        <!-- View tabs -->
        <nav style="display:flex; gap:2px; margin-bottom:16px; border-bottom:2px solid #e5e7eb">
          ${['input', 'table', 'charts'].map(v => `
            <button class="tab-btn" data-view="${v}"
                    style="padding:8px 16px; background:${this.view === v ? '#3b82f6' : 'transparent'}; 
                           color:${this.view === v ? '#fff' : '#666'}; border:none; border-radius:8px 8px 0 0; cursor:pointer; font-weight:500">
              ${v === 'input' ? '📋 Input' : v === 'table' ? '📊 Table' : '📈 Charts'}
            </button>
          `).join('')}
        </nav>
        
        ${this.view === 'input' ? this.renderInput() : ''}
        ${this.view === 'table' ? this.renderTable() : ''}
        ${this.view === 'charts' ? this.renderCharts() : ''}
      </div>
    `;
    
    this.attachListeners();
    if (this.view === 'charts') this.drawCharts();
  }
  
  renderInput() {
    return `
      <div>
        <p style="color:#666; margin:0 0 8px">Paste your bank statement (CSV or freeform):</p>
        <textarea id="statement-input" rows="12" 
                  style="width:100%; padding:12px; border:1px solid #e5e7eb; border-radius:8px; font-family:monospace; font-size:13px; resize:vertical"
                  placeholder="15/03/2025, Swiggy Order #1234, 450.00
16/03/2025, Salary Credit, -75000.00
17/03/2025, Amazon Purchase, 2499.00"></textarea>
        <button id="btn-parse" style="margin-top:12px; padding:10px 24px; background:#3b82f6; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:14px">
          Parse & Categorize
        </button>
      </div>
    `;
  }
  
  renderTable() {
    const allCategories = [...new Set([
      ...Object.values(this.rules), 'Uncategorized',
      ...this.transactions.map(t => t.category)
    ])];
    
    return `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
          <span style="color:#666">${this.transactions.length} transactions</span>
          <button id="btn-export" style="padding:8px 16px; background:#22c55e; color:#fff; border:none; border-radius:8px; cursor:pointer">
            📥 Export CSV
          </button>
        </div>
        
        <div style="overflow-x:auto">
          <table style="width:100%; border-collapse:collapse; font-size:13px">
            <thead>
              <tr style="background:#f8f9fa; text-align:left">
                <th style="padding:8px; border-bottom:2px solid #e5e7eb">Date</th>
                <th style="padding:8px; border-bottom:2px solid #e5e7eb">Description</th>
                <th style="padding:8px; border-bottom:2px solid #e5e7eb; text-align:right">Amount</th>
                <th style="padding:8px; border-bottom:2px solid #e5e7eb">Category</th>
              </tr>
            </thead>
            <tbody>
              ${this.transactions.map(t => `
                <tr style="border-bottom:1px solid #f0f0f0" data-id="${t.id}">
                  <td style="padding:8px; white-space:nowrap">${t.date}</td>
                  <td style="padding:8px">${this.sanitize(t.description)}</td>
                  <td style="padding:8px; text-align:right; color:${t.type === 'credit' ? '#22c55e' : '#333'}; font-weight:500">
                    ${t.type === 'credit' ? '+' : ''}₹${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style="padding:8px">
                    <select data-id="${t.id}" class="cat-select" 
                            style="padding:4px 8px; border:1px solid ${t.manualCategory ? '#3b82f6' : '#e5e7eb'}; border-radius:4px; font-size:12px">
                      ${allCategories.map(cat => `
                        <option value="${cat}" ${t.category === cat ? 'selected' : ''}>${cat}</option>
                      `).join('')}
                    </select>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  renderCharts() {
    return `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px">
        <div>
          <h3>Monthly Spending</h3>
          <canvas id="bar-chart" width="400" height="250" style="width:100%"></canvas>
        </div>
        <div>
          <h3>By Category</h3>
          <canvas id="donut-chart" width="300" height="300" style="width:100%"></canvas>
          <div id="donut-legend" style="margin-top:12px; font-size:12px"></div>
        </div>
      </div>
    `;
  }
  
  drawCharts() {
    this.drawBarChart();
    this.drawDonutChart();
  }
  
  drawBarChart() {
    const canvas = this.container.querySelector('#bar-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const data = this.getMonthlyData();
    if (data.length === 0) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 400 * dpr;
    canvas.height = 250 * dpr;
    ctx.scale(dpr, dpr);
    
    const w = 400, h = 250;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;
    
    const maxVal = Math.max(...data.map(d => d[1]));
    const barWidth = plotW / data.length * 0.6;
    const gap = plotW / data.length * 0.4;
    
    // Y-axis
    ctx.strokeStyle = '#e5e7eb';
    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + plotH * (1 - i / 4);
      const val = maxVal * i / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.fillText(`₹${Math.round(val / 1000)}K`, padding.left - 5, y + 3);
    }
    
    // Bars
    data.forEach(([month, amount], i) => {
      const x = padding.left + i * (barWidth + gap) + gap / 2;
      const barH = (amount / maxVal) * plotH;
      const y = padding.top + plotH - barH;
      
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x, y, barWidth, barH);
      
      // Month label
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center';
      ctx.font = '10px sans-serif';
      ctx.fillText(month.slice(5), x + barWidth / 2, h - padding.bottom + 15);
    });
  }
  
  drawDonutChart() {
    const canvas = this.container.querySelector('#donut-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const data = this.getCategoryData();
    if (data.length === 0) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 300 * dpr;
    canvas.height = 300 * dpr;
    ctx.scale(dpr, dpr);
    
    const cx = 150, cy = 150, radius = 120, holeRadius = 60;
    const total = data.reduce((s, d) => s + d[1], 0);
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#06b6d4', '#ec4899'];
    
    let startAngle = -Math.PI / 2;
    data.forEach(([cat, amount], i) => {
      const angle = (amount / total) * Math.PI * 2;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + angle);
      ctx.closePath();
      ctx.fill();
      startAngle += angle;
    });
    
    // Donut hole
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`₹${Math.round(total / 1000)}K`, cx, cy);
    
    // Legend
    const legend = this.container.querySelector('#donut-legend');
    if (legend) {
      legend.innerHTML = data.map(([cat, amount], i) => `
        <div style="display:flex; align-items:center; gap:6px; margin:3px 0">
          <span style="width:10px;height:10px;border-radius:2px;background:${colors[i % colors.length]};display:inline-block"></span>
          ${cat}: ₹${amount.toLocaleString('en-IN')} (${Math.round(amount / total * 100)}%)
        </div>
      `).join('');
    }
  }
  
  attachListeners() {
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.view = btn.dataset.view;
        this.render();
      });
    });
    
    this.container.querySelector('#btn-parse')?.addEventListener('click', () => {
      const text = this.container.querySelector('#statement-input')?.value;
      if (text?.trim()) this.parseStatements(text);
    });
    
    this.container.querySelector('#btn-export')?.addEventListener('click', () => {
      this.exportCSV();
    });
    
    this.container.querySelectorAll('.cat-select').forEach(sel => {
      sel.addEventListener('change', () => {
        this.reCategorizeTxn(sel.dataset.id, sel.value);
      });
    });
  }
  
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- Intuit Craft Demo = **Transaction categorizer with auto-categorization, charts, CSV export**
- **Keyword→category rules**: compiled regex `new RegExp(pattern, 'i')` — first match wins
- **CSV parsing**: regex `^([^,]+),\s*([^,]+),\s*([+-]?\d[\d,]*\.?\d*)$` — handle amount with commas
- **Donut chart**: Canvas arcs + white circle center — standard technique for category breakdown
- **Bar chart**: Y-axis grid lines with `₹NK` labels — proportional bar heights
- **CSV export**: `Blob` + `URL.createObjectURL` + `<a download>` — proper escaping for commas/quotes in descriptions
- **Craft Demo tips at Intuit**: focus on code quality + usability + tests + architecture decisions — not just features
- Intuit = **personal finance** — TurboTax, QuickBooks, Mint — expect financial data visualization questions

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Craft Demo | Hard | CSV Parse, Auto-Categorize, Charts |
| Technical 1 | Hard | JS, React, Performance |
| Technical 2 | Hard | System Design, Architecture |
| HM | Medium | Culture Fit |
