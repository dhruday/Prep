# Paytm — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Paytm |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/paytm-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge: Build a Mini Wallet App with Transaction History + Budget Tracker
- Wallet balance display with add/withdraw
- Transaction history with search and filters (type, date range)
- Category-wise spending breakdown (pie chart)
- Monthly budget tracker with alert at 80%
- Currency formatting (Indian Rupees)
- LocalStorage persistence

```javascript
/**
 * Mini Wallet App:
 * - Add/Withdraw money
 * - Transaction history with search/filter
 * - Category-wise spending pie chart (Canvas)
 * - Monthly budget tracker with threshold alert
 * - LocalStorage persistence
 */
class WalletApp {
  constructor(container) {
    this.container = container;
    
    // Load from localStorage
    const saved = this.loadFromStorage();
    this.balance = saved.balance || 10000;
    this.transactions = saved.transactions || [];
    this.budget = saved.budget || 20000; // Monthly budget
    this.categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'];
    
    this.searchQuery = '';
    this.filterType = 'all'; // all, credit, debit
    this.filterMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    this.render();
  }
  
  addTransaction(type, amount, category = 'Other', description = '') {
    if (amount <= 0) return { error: 'Amount must be positive' };
    if (type === 'debit' && amount > this.balance) return { error: 'Insufficient balance' };
    
    const txn = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type, // 'credit' | 'debit'
      amount,
      category,
      description: description || `${type === 'credit' ? 'Added' : 'Spent'} ₹${this.formatCurrency(amount)}`,
      timestamp: Date.now(),
      balanceAfter: type === 'credit' ? this.balance + amount : this.balance - amount
    };
    
    this.balance = txn.balanceAfter;
    this.transactions.unshift(txn);
    this.saveToStorage();
    this.render();
    
    // Budget alert
    const monthSpent = this.getMonthlySpending();
    if (monthSpent >= this.budget * 0.8) {
      this.showAlert(`⚠️ You've spent ${Math.round(monthSpent / this.budget * 100)}% of your monthly budget!`);
    }
    
    return { success: true, txn };
  }
  
  getMonthlySpending(month) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return this.transactions
      .filter(t => t.type === 'debit' && new Date(t.timestamp).toISOString().slice(0, 7) === targetMonth)
      .reduce((sum, t) => sum + t.amount, 0);
  }
  
  getCategoryBreakdown(month) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const debits = this.transactions.filter(
      t => t.type === 'debit' && new Date(t.timestamp).toISOString().slice(0, 7) === targetMonth
    );
    
    const breakdown = {};
    for (const txn of debits) {
      breakdown[txn.category] = (breakdown[txn.category] || 0) + txn.amount;
    }
    
    return Object.entries(breakdown)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }
  
  get filteredTransactions() {
    return this.transactions.filter(t => {
      // Type filter
      if (this.filterType !== 'all' && t.type !== this.filterType) return false;
      
      // Month filter
      const txnMonth = new Date(t.timestamp).toISOString().slice(0, 7);
      if (this.filterMonth && txnMonth !== this.filterMonth) return false;
      
      // Search
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const searchable = `${t.description} ${t.category} ${this.formatCurrency(t.amount)}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      
      return true;
    });
  }
  
  formatCurrency(amount) {
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  
  render() {
    const monthSpent = this.getMonthlySpending();
    const budgetPercent = Math.min(100, (monthSpent / this.budget) * 100);
    const breakdown = this.getCategoryBreakdown();
    
    this.container.innerHTML = `
      <div class="wallet-app" style="font-family:-apple-system,sans-serif; max-width:480px; margin:0 auto">
        <!-- Balance Card -->
        <div style="background:linear-gradient(135deg, #00BAF2, #0084BD); color:#fff; padding:24px; border-radius:16px; margin:16px">
          <p style="font-size:13px; opacity:0.8; margin:0">Wallet Balance</p>
          <h1 style="font-size:36px; margin:8px 0">₹${this.formatCurrency(this.balance)}</h1>
          <div style="display:flex; gap:8px; margin-top:16px">
            <button id="btn-add" style="flex:1; padding:10px; background:rgba(255,255,255,0.2); color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:14px">
              + Add Money
            </button>
            <button id="btn-withdraw" style="flex:1; padding:10px; background:rgba(255,255,255,0.2); color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:14px">
              − Withdraw
            </button>
          </div>
        </div>
        
        <!-- Budget Tracker -->
        <div style="margin:0 16px; padding:16px; background:#fff; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,0.1)">
          <div style="display:flex; justify-content:space-between; align-items:center">
            <span style="font-weight:600">Monthly Budget</span>
            <span style="color:${budgetPercent >= 80 ? '#ef4444' : '#22c55e'}">
              ₹${this.formatCurrency(monthSpent)} / ₹${this.formatCurrency(this.budget)}
            </span>
          </div>
          <div style="height:8px; background:#e5e7eb; border-radius:4px; margin-top:8px; overflow:hidden"
               role="progressbar" aria-valuenow="${Math.round(budgetPercent)}" aria-valuemin="0" aria-valuemax="100">
            <div style="width:${budgetPercent}%; height:100%; border-radius:4px; transition:width 0.5s;
                 background:${budgetPercent >= 80 ? '#ef4444' : budgetPercent >= 60 ? '#eab308' : '#22c55e'}"></div>
          </div>
          <p style="font-size:12px; color:#999; margin:4px 0 0">${Math.round(budgetPercent)}% spent this month</p>
        </div>
        
        <!-- Category Breakdown Pie Chart -->
        ${breakdown.length > 0 ? `
          <div style="margin:16px; padding:16px; background:#fff; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,0.1)">
            <h3 style="margin:0 0 12px">Spending by Category</h3>
            <div style="display:flex; align-items:center; gap:16px">
              <canvas id="pie-chart" width="140" height="140" style="width:140px; height:140px"></canvas>
              <div id="pie-legend" style="flex:1; font-size:13px"></div>
            </div>
          </div>
        ` : ''}
        
        <!-- Transaction History -->
        <div style="margin:16px">
          <h3 style="margin:0 0 12px">Transactions</h3>
          
          <!-- Search + Filters -->
          <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap">
            <input type="search" id="txn-search" placeholder="Search transactions..." 
                   value="${this.sanitize(this.searchQuery)}"
                   style="flex:1; min-width:150px; padding:8px 12px; border:1px solid #e5e7eb; border-radius:8px">
            <select id="filter-type" style="padding:8px; border:1px solid #e5e7eb; border-radius:8px">
              <option value="all" ${this.filterType === 'all' ? 'selected' : ''}>All</option>
              <option value="credit" ${this.filterType === 'credit' ? 'selected' : ''}>Credit</option>
              <option value="debit" ${this.filterType === 'debit' ? 'selected' : ''}>Debit</option>
            </select>
            <input type="month" id="filter-month" value="${this.filterMonth}"
                   style="padding:8px; border:1px solid #e5e7eb; border-radius:8px">
          </div>
          
          <!-- Transaction List -->
          <div role="list" aria-label="Transaction history" style="max-height:300px; overflow-y:auto">
            ${this.filteredTransactions.length === 0 
              ? '<p style="text-align:center; color:#999">No transactions found</p>'
              : this.filteredTransactions.map(t => this.renderTransaction(t)).join('')
            }
          </div>
        </div>
      </div>
    `;
    
    this.attachListeners();
    if (breakdown.length > 0) this.drawPieChart(breakdown);
  }
  
  renderTransaction(txn) {
    const date = new Date(txn.timestamp);
    const timeStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + 
                    ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    
    return `
      <div role="listitem" style="display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid #f0f0f0">
        <div style="width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center;
             background:${txn.type === 'credit' ? '#f0fdf4' : '#fef2f2'}; font-size:18px">
          ${txn.type === 'credit' ? '💰' : '💸'}
        </div>
        <div style="flex:1">
          <div style="font-weight:500">${this.sanitize(txn.description)}</div>
          <div style="font-size:12px; color:#999">${txn.category} · ${timeStr}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:600; color:${txn.type === 'credit' ? '#22c55e' : '#ef4444'}">
            ${txn.type === 'credit' ? '+' : '−'}₹${this.formatCurrency(txn.amount)}
          </div>
          <div style="font-size:11px; color:#999">Bal: ₹${this.formatCurrency(txn.balanceAfter)}</div>
        </div>
      </div>
    `;
  }
  
  drawPieChart(breakdown) {
    const canvas = this.container.querySelector('#pie-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 140 * dpr;
    canvas.height = 140 * dpr;
    ctx.scale(dpr, dpr);
    
    const cx = 70, cy = 70, radius = 60;
    const total = breakdown.reduce((s, b) => s + b.amount, 0);
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];
    
    let startAngle = -Math.PI / 2;
    
    breakdown.forEach((item, i) => {
      const sliceAngle = (item.amount / total) * Math.PI * 2;
      
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();
      
      startAngle += sliceAngle;
    });
    
    // Donut hole
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Center text
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`₹${Math.round(total / 1000)}K`, cx, cy);
    
    // Legend
    const legend = this.container.querySelector('#pie-legend');
    if (legend) {
      legend.innerHTML = breakdown.map((item, i) => `
        <div style="display:flex; align-items:center; gap:6px; margin:4px 0">
          <span style="width:10px; height:10px; border-radius:50%; background:${colors[i % colors.length]};display:inline-block"></span>
          <span style="flex:1">${item.category}</span>
          <span style="font-weight:500">${Math.round(item.amount / total * 100)}%</span>
        </div>
      `).join('');
    }
  }
  
  attachListeners() {
    this.container.querySelector('#btn-add')?.addEventListener('click', () => {
      const amount = parseFloat(prompt('Enter amount to add:') ?? '0');
      if (amount > 0) this.addTransaction('credit', amount, 'Other', 'Added to wallet');
    });
    
    this.container.querySelector('#btn-withdraw')?.addEventListener('click', () => {
      const amount = parseFloat(prompt('Enter amount:') ?? '0');
      const category = prompt(`Category (${this.categories.join(', ')}):`) || 'Other';
      if (amount > 0) this.addTransaction('debit', amount, category);
    });
    
    this.container.querySelector('#txn-search')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.render();
    });
    
    this.container.querySelector('#filter-type')?.addEventListener('change', (e) => {
      this.filterType = e.target.value;
      this.render();
    });
    
    this.container.querySelector('#filter-month')?.addEventListener('change', (e) => {
      this.filterMonth = e.target.value;
      this.render();
    });
  }
  
  showAlert(msg) {
    const alert = document.createElement('div');
    alert.setAttribute('role', 'alert');
    alert.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#fef2f2;color:#ef4444;padding:12px 24px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:1000;font-weight:500';
    alert.textContent = msg;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 4000);
  }
  
  saveToStorage() {
    try {
      localStorage.setItem('wallet-app', JSON.stringify({
        balance: this.balance,
        transactions: this.transactions.slice(0, 500), // Keep last 500
        budget: this.budget
      }));
    } catch (e) { /* quota exceeded — graceful degradation */ }
  }
  
  loadFromStorage() {
    try {
      return JSON.parse(localStorage.getItem('wallet-app') || '{}');
    } catch { return {}; }
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
- Paytm FE = **Wallet app with transaction history, category pie chart, budget tracker**
- **Donut pie chart**: Canvas arcs → donut hole `ctx.arc(cx, cy, smallRadius, 0, 2π)` fill white
- **Budget tracker**: progress bar color changes at 60% (yellow), 80% (red) — visual alert
- **Indian currency**: `toLocaleString('en-IN', { minimumFractionDigits: 2 })` — ₹1,00,000.00 format
- **LocalStorage persistence**: `JSON.stringify` save, `JSON.parse` load — try/catch for quota exceeded
- **Transaction search**: filter chain — type → month → text search through description + category + amount
- **balanceAfter per txn**: store running balance — enables "balance at time of transaction" display
- Paytm = **payments + fintech UX** — wallet flows, transaction history, budgeting features

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Medium-Hard | Canvas Pie Chart, LocalStorage, Filters |
| Technical | Hard | JS, React, Performance |
| HM | Medium | Culture Fit |
