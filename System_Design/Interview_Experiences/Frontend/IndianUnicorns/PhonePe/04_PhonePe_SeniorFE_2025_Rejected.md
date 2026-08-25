# PhonePe — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | PhonePe |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected (Technical Round 2) |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/phonepe-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + 2 Technical)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge
**Build an Expense Tracker Dashboard**
- Add expenses with category, amount, date, note
- Monthly summary chart (Canvas bar chart)
- Category breakdown (pie chart)
- Budget alerts: set category budget, warn when 80% used, block at 100%
- Filter by date range and category
- Export to CSV

### 💡 Expense Tracker

```javascript
class ExpenseTracker {
  constructor(container) {
    this.container = container;
    this.expenses = this.loadFromStorage();
    this.budgets = this.loadBudgets(); // { category: amount }
    this.filter = { startDate: null, endDate: null, category: 'all' };
    this.categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'];
    
    this.render();
  }
  
  get filteredExpenses() {
    return this.expenses.filter(exp => {
      if (this.filter.category !== 'all' && exp.category !== this.filter.category) return false;
      if (this.filter.startDate && new Date(exp.date) < new Date(this.filter.startDate)) return false;
      if (this.filter.endDate && new Date(exp.date) > new Date(this.filter.endDate)) return false;
      return true;
    });
  }
  
  render() {
    const filtered = this.filteredExpenses;
    const totalSpent = filtered.reduce((s, e) => s + e.amount, 0);
    const categoryTotals = this.getCategoryTotals(filtered);
    
    this.container.innerHTML = `
      <div class="expense-tracker" role="main" aria-label="Expense Tracker">
        <header>
          <h1>💰 Expense Tracker</h1>
          <button class="btn-export" aria-label="Export to CSV">📥 Export CSV</button>
        </header>
        
        <!-- Add Expense Form -->
        <form class="add-expense-form" aria-label="Add new expense">
          <select id="exp-category" required aria-label="Category">
            <option value="">Category</option>
            ${this.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
          <input type="number" id="exp-amount" placeholder="Amount (₹)" min="1" step="0.01" required
                 aria-label="Amount" inputmode="decimal">
          <input type="date" id="exp-date" required aria-label="Date" 
                 value="${new Date().toISOString().split('T')[0]}">
          <input type="text" id="exp-note" placeholder="Note (optional)" maxlength="100" aria-label="Note">
          <button type="submit">Add Expense</button>
        </form>
        
        <!-- Filters -->
        <div class="filters" role="group" aria-label="Filters">
          <input type="date" class="filter-start" value="${this.filter.startDate || ''}" aria-label="Start date">
          <input type="date" class="filter-end" value="${this.filter.endDate || ''}" aria-label="End date">
          <select class="filter-category" aria-label="Filter by category">
            <option value="all">All Categories</option>
            ${this.categories.map(c => `
              <option value="${c}" ${this.filter.category === c ? 'selected' : ''}>${c}</option>
            `).join('')}
          </select>
        </div>
        
        <!-- Summary Cards -->
        <div class="summary-cards">
          <div class="card total">
            <span class="card-label">Total Spent</span>
            <span class="card-value">₹${totalSpent.toLocaleString()}</span>
          </div>
          <div class="card count">
            <span class="card-label">Transactions</span>
            <span class="card-value">${filtered.length}</span>
          </div>
          <div class="card avg">
            <span class="card-label">Average</span>
            <span class="card-value">₹${filtered.length ? Math.round(totalSpent / filtered.length) : 0}</span>
          </div>
        </div>
        
        <!-- Budget Alerts -->
        <div class="budget-alerts" role="region" aria-label="Budget alerts">
          ${this.renderBudgetAlerts(categoryTotals)}
        </div>
        
        <!-- Charts -->
        <div class="charts-row">
          <div class="chart-container">
            <h3>Monthly Spending</h3>
            <canvas id="bar-chart" width="400" height="250"></canvas>
          </div>
          <div class="chart-container">
            <h3>By Category</h3>
            <canvas id="pie-chart" width="250" height="250"></canvas>
          </div>
        </div>
        
        <!-- Expense List -->
        <table class="expense-table" role="table" aria-label="Expense list">
          <thead>
            <tr><th>Date</th><th>Category</th><th>Amount</th><th>Note</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).map(exp => `
              <tr data-id="${exp.id}">
                <td>${new Date(exp.date).toLocaleDateString()}</td>
                <td>${this._sanitize(exp.category)}</td>
                <td>₹${exp.amount.toLocaleString()}</td>
                <td>${this._sanitize(exp.note || '')}</td>
                <td><button class="btn-delete" aria-label="Delete expense">&times;</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    this.drawBarChart(filtered);
    this.drawPieChart(categoryTotals);
    this.attachListeners();
  }
  
  renderBudgetAlerts(categoryTotals) {
    const alerts = [];
    
    for (const [category, budget] of Object.entries(this.budgets)) {
      const spent = categoryTotals[category] || 0;
      const percent = Math.round((spent / budget) * 100);
      
      if (percent >= 100) {
        alerts.push(`<div class="alert danger" role="alert">🚫 ${category}: Budget exceeded! ₹${spent}/₹${budget}</div>`);
      } else if (percent >= 80) {
        alerts.push(`<div class="alert warning" role="alert">⚠️ ${category}: ${percent}% of budget used (₹${spent}/₹${budget})</div>`);
      }
    }
    
    return alerts.join('');
  }
  
  getCategoryTotals(expenses) {
    return expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});
  }
  
  drawBarChart(expenses) {
    const canvas = this.container.querySelector('#bar-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Group by month
    const monthly = {};
    expenses.forEach(exp => {
      const month = new Date(exp.date).toLocaleDateString('en', { year: '2-digit', month: 'short' });
      monthly[month] = (monthly[month] || 0) + exp.amount;
    });
    
    const labels = Object.keys(monthly);
    const values = Object.values(monthly);
    const maxVal = Math.max(...values, 1);
    
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const w = canvas.width - padding.left - padding.right;
    const h = canvas.height - padding.top - padding.bottom;
    const barWidth = Math.min(w / labels.length * 0.7, 40);
    const gap = w / labels.length;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Bars
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
    
    labels.forEach((label, i) => {
      const barH = (values[i] / maxVal) * h;
      const x = padding.left + i * gap + (gap - barWidth) / 2;
      const y = padding.top + h - barH;
      
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, y, barWidth, barH);
      
      // Label
      ctx.fillStyle = '#666';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + barWidth / 2, padding.top + h + 20);
      
      // Value on top
      ctx.fillText(`₹${Math.round(values[i])}`, x + barWidth / 2, y - 5);
    });
  }
  
  drawPieChart(categoryTotals) {
    const canvas = this.container.querySelector('#pie-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const entries = Object.entries(categoryTotals).filter(([, v]) => v > 0);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    
    if (total === 0) return;
    
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 30;
    
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'];
    
    let startAngle = -Math.PI / 2;
    
    entries.forEach(([category, value], i) => {
      const sliceAngle = (value / total) * 2 * Math.PI;
      
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      
      // Label
      const midAngle = startAngle + sliceAngle / 2;
      const labelX = cx + (radius * 0.65) * Math.cos(midAngle);
      const labelY = cy + (radius * 0.65) * Math.sin(midAngle);
      
      ctx.fillStyle = '#fff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${category}`, labelX, labelY - 6);
      ctx.fillText(`${Math.round(value / total * 100)}%`, labelX, labelY + 8);
      
      startAngle += sliceAngle;
    });
  }
  
  exportToCSV() {
    const rows = [['Date', 'Category', 'Amount', 'Note']];
    
    this.filteredExpenses.forEach(exp => {
      rows.push([
        new Date(exp.date).toLocaleDateString(),
        exp.category,
        exp.amount.toString(),
        (exp.note || '').replace(/,/g, ' ') // Escape commas
      ]);
    });
    
    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  addExpense(data) {
    // Budget check
    const budget = this.budgets[data.category];
    if (budget) {
      const currentSpend = this.expenses
        .filter(e => e.category === data.category)
        .reduce((s, e) => s + e.amount, 0);
      
      if (currentSpend + data.amount > budget) {
        if (!confirm(`This will exceed your ${data.category} budget (₹${budget}). Continue?`)) {
          return;
        }
      }
    }
    
    this.expenses.push({
      id: crypto.randomUUID(),
      ...data,
      amount: parseFloat(data.amount)
    });
    this.saveToStorage();
    this.render();
  }
  
  deleteExpense(id) {
    this.expenses = this.expenses.filter(e => e.id !== id);
    this.saveToStorage();
    this.render();
  }
  
  saveToStorage() {
    try { localStorage.setItem('expenses', JSON.stringify(this.expenses)); } catch (e) {}
  }
  
  loadFromStorage() {
    try { return JSON.parse(localStorage.getItem('expenses')) || []; } catch { return []; }
  }
  
  loadBudgets() {
    try { return JSON.parse(localStorage.getItem('budgets')) || {}; } catch { return {}; }
  }
  
  attachListeners() {
    // Add expense form
    this.container.querySelector('.add-expense-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      this.addExpense({
        category: form.querySelector('#exp-category').value,
        amount: form.querySelector('#exp-amount').value,
        date: form.querySelector('#exp-date').value,
        note: form.querySelector('#exp-note').value
      });
    });
    
    // Filters
    this.container.querySelector('.filter-start').addEventListener('change', (e) => {
      this.filter.startDate = e.target.value || null;
      this.render();
    });
    this.container.querySelector('.filter-end').addEventListener('change', (e) => {
      this.filter.endDate = e.target.value || null;
      this.render();
    });
    this.container.querySelector('.filter-category').addEventListener('change', (e) => {
      this.filter.category = e.target.value;
      this.render();
    });
    
    // Delete expense
    this.container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('tr').dataset.id;
        this.deleteExpense(id);
      });
    });
    
    // Export
    this.container.querySelector('.btn-export').addEventListener('click', () => this.exportToCSV());
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- PhonePe FE = **Expense tracker + Canvas charts + budget alerts + CSV export**
- **Budget alerts**: calculate % used per category — warn at 80%, confirm at 100%
- **Canvas bar chart**: group expenses by month, draw rects proportional to max value
- **Canvas pie chart**: calculate slice angles from proportions — label at midpoint of each arc
- **CSV export**: `Blob` + `URL.createObjectURL` + programmatic `<a>` click — works client-side, no server
- **localStorage persistence**: save/load on every mutation — handle JSON parse errors gracefully
- **Filter architecture**: maintain filter state, compute `filteredExpenses` getter — all renders use filtered data
- PhonePe FE rejected in **Technical Round 2** — deeper JS/React knowledge probed

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Dashboard, Canvas Charts, CSV |
| Technical 1 | Medium-Hard | JS Concepts, React |
| Technical 2 | Hard | Deep JS, System Design |
