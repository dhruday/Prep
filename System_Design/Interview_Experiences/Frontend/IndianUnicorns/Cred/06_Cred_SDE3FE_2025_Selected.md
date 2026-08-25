# CRED — Senior FE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | CRED |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (JS + Machine Coding + FE System Design + HM)
- **Timeline:** 2 weeks
- **Format:** On-site

## Round 2: Machine Coding — Credit Card Bill Summary Dashboard

### Problem
Build a credit card bill summary dashboard:
- Card selector (multiple cards)
- Bill breakdown: donut chart of spending categories
- Transaction timeline grouped by date
- Spend analytics (month-over-month comparison)
- Payment due date with countdown
- Minimum due, total due, custom amount pay option

### 💡 Interview-Ready Answer

```javascript
class BillDashboard {
  constructor(container, data) {
    this.container = container;
    this.cards = data.cards; // [{ id, last4, type, totalDue, minDue, dueDate, transactions, categories }]
    this.selectedCardIdx = 0;
    this.payAmount = '';

    this.render();
  }

  get card() { return this.cards[this.selectedCardIdx]; }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'bill-dashboard';
    this.container.style.cssText = 'max-width:600px;margin:0 auto;font-family:system-ui;';

    this.renderCardSelector();
    this.renderDueSummary();
    this.renderDonutChart();
    this.renderPaySection();
    this.renderTransactions();
  }

  renderCardSelector() {
    const selector = document.createElement('div');
    selector.style.cssText = 'display:flex;gap:12px;overflow-x:auto;padding:8px 0;margin-bottom:16px;';

    this.cards.forEach((card, i) => {
      const cardEl = document.createElement('button');
      const isActive = i === this.selectedCardIdx;
      cardEl.style.cssText = `
        min-width:200px;padding:16px;border-radius:12px;border:2px solid ${isActive ? '#1a73e8' : 'transparent'};
        background:${card.type === 'visa' ? 'linear-gradient(135deg,#1a1a2e,#16213e)' : 'linear-gradient(135deg,#0f0c29,#302b63)'};
        color:#fff;cursor:pointer;text-align:left;font-family:inherit;
      `;

      cardEl.innerHTML = `
        <div style="font-size:12px;opacity:0.7;">${card.type.toUpperCase()}</div>
        <div style="font-size:18px;letter-spacing:2px;margin:8px 0;">•••• ${card.last4}</div>
        <div style="font-size:14px;">₹${this.formatAmount(card.totalDue)} due</div>
      `;

      cardEl.addEventListener('click', () => {
        this.selectedCardIdx = i;
        this.payAmount = '';
        this.render();
      });
      selector.appendChild(cardEl);
    });

    this.container.appendChild(selector);
  }

  renderDueSummary() {
    const card = this.card;
    const dueDate = new Date(card.dueDate);
    const daysLeft = Math.max(0, Math.ceil((dueDate - Date.now()) / 86400000));
    const isOverdue = daysLeft === 0 && dueDate < new Date();

    const summary = document.createElement('div');
    summary.style.cssText = `padding:20px;border-radius:12px;margin-bottom:16px;background:${isOverdue ? '#fef2f2' : '#f0fdf4'};`;

    summary.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-size:13px;color:#666;">Total Due</div>
          <div style="font-size:32px;font-weight:700;color:#1a1a1a;">₹${this.formatAmount(card.totalDue)}</div>
          <div style="font-size:13px;color:#666;margin-top:4px;">Min due: ₹${this.formatAmount(card.minDue)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:13px;color:${isOverdue ? '#e53e3e' : '#666'};">
            ${isOverdue ? '⚠️ Overdue!' : `Due in ${daysLeft} days`}
          </div>
          <div style="font-size:14px;font-weight:500;">
            ${dueDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
          </div>
          ${!isOverdue && daysLeft <= 5 ? '<div style="font-size:12px;color:#f59e0b;">⚡ Pay soon to avoid late fee</div>' : ''}
        </div>
      </div>
    `;

    this.container.appendChild(summary);
  }

  renderDonutChart() {
    const categories = this.card.categories;
    if (!categories || categories.length === 0) return;

    const section = document.createElement('div');
    section.style.cssText = 'display:flex;gap:16px;align-items:center;margin-bottom:16px;padding:16px;border:1px solid #eee;border-radius:12px;';

    // Canvas donut
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    canvas.style.cssText = 'width:160px;height:160px;flex-shrink:0;';

    const ctx = canvas.getContext('2d');
    const total = categories.reduce((s, c) => s + c.amount, 0);
    const colors = ['#1a73e8', '#e53e3e', '#f59e0b', '#22c55e', '#8b5cf6', '#ec4899'];
    const cx = 80, cy = 80, r = 60, innerR = 40;
    let startAngle = -Math.PI / 2;

    categories.forEach((cat, i) => {
      const sliceAngle = (cat.amount / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      startAngle += sliceAngle;
    });

    // Center text
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`₹${this.formatAmount(total)}`, cx, cy - 4);
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#999';
    ctx.fillText('Total Spend', cx, cy + 12);

    section.appendChild(canvas);

    // Legend
    const legend = document.createElement('div');
    legend.style.cssText = 'flex:1;';

    categories.forEach((cat, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;';
      row.innerHTML = `
        <span style="width:10px;height:10px;border-radius:50%;background:${colors[i % colors.length]};flex-shrink:0;"></span>
        <span style="flex:1;">${this.escapeHtml(cat.name)}</span>
        <span style="font-weight:500;">₹${this.formatAmount(cat.amount)}</span>
        <span style="color:#999;width:36px;text-align:right;">${((cat.amount / total) * 100).toFixed(0)}%</span>
      `;
      legend.appendChild(row);
    });

    section.appendChild(legend);
    this.container.appendChild(section);
  }

  renderPaySection() {
    const section = document.createElement('div');
    section.style.cssText = 'padding:16px;border:1px solid #eee;border-radius:12px;margin-bottom:16px;';

    const title = document.createElement('h4');
    title.textContent = 'Pay Bill';
    title.style.cssText = 'margin:0 0 12px;';
    section.appendChild(title);

    // Quick amount buttons
    const quickAmounts = document.createElement('div');
    quickAmounts.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;';

    [
      { label: 'Min Due', amount: this.card.minDue },
      { label: 'Total Due', amount: this.card.totalDue },
    ].forEach(opt => {
      const btn = document.createElement('button');
      const isActive = this.payAmount === String(opt.amount);
      btn.textContent = `${opt.label}: ₹${this.formatAmount(opt.amount)}`;
      btn.style.cssText = `
        flex:1;padding:10px;border:1px solid ${isActive ? '#1a73e8' : '#ddd'};
        border-radius:8px;background:${isActive ? '#eef2ff' : '#fff'};
        cursor:pointer;font-size:13px;font-weight:${isActive ? '600' : '400'};color:${isActive ? '#1a73e8' : '#333'};
      `;
      btn.addEventListener('click', () => {
        this.payAmount = String(opt.amount);
        this.render();
      });
      quickAmounts.appendChild(btn);
    });
    section.appendChild(quickAmounts);

    // Custom amount
    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex;gap:8px;';

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.placeholder = 'Enter custom amount';
    input.value = this.payAmount;
    input.style.cssText = 'flex:1;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:15px;';
    input.addEventListener('input', (e) => {
      this.payAmount = e.target.value.replace(/[^\d.]/g, '');
    });
    inputRow.appendChild(input);

    const payBtn = document.createElement('button');
    payBtn.textContent = 'Pay Now';
    payBtn.style.cssText = 'padding:12px 24px;background:#1a73e8;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;';
    payBtn.addEventListener('click', () => {
      const amount = parseFloat(this.payAmount);
      if (!amount || amount <= 0) return;
      payBtn.textContent = 'Processing...';
      payBtn.disabled = true;
      setTimeout(() => {
        payBtn.textContent = '✓ Paid!';
        payBtn.style.background = '#22c55e';
      }, 1500);
    });
    inputRow.appendChild(payBtn);

    section.appendChild(inputRow);
    this.container.appendChild(section);
  }

  renderTransactions() {
    const transactions = this.card.transactions;
    if (!transactions || transactions.length === 0) return;

    const section = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = 'Recent Transactions';
    title.style.cssText = 'margin:0 0 12px;';
    section.appendChild(title);

    // Group by date
    const groups = new Map();
    for (const txn of transactions) {
      const dateKey = new Date(txn.date).toLocaleDateString('en-IN', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey).push(txn);
    }

    for (const [date, txns] of groups) {
      const dateHeader = document.createElement('div');
      dateHeader.style.cssText = 'font-size:12px;color:#666;padding:8px 0 4px;font-weight:600;';
      dateHeader.textContent = date;
      section.appendChild(dateHeader);

      txns.forEach(txn => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f5f5f5;';

        const icons = { food: '🍔', shopping: '🛍️', travel: '✈️', entertainment: '🎬', bills: '📱', other: '💳' };

        row.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">${icons[txn.category] || icons.other}</span>
            <div>
              <div style="font-weight:500;font-size:14px;">${this.escapeHtml(txn.merchant)}</div>
              <div style="font-size:12px;color:#999;">${txn.category}</div>
            </div>
          </div>
          <span style="font-weight:600;color:#e53e3e;">₹${this.formatAmount(txn.amount)}</span>
        `;
        section.appendChild(row);
      });
    }

    this.container.appendChild(section);
  }

  formatAmount(num) {
    return Number(num).toLocaleString('en-IN');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Usage:
// new BillDashboard(document.getElementById('app'), {
//   cards: [{
//     id: 'c1', last4: '4242', type: 'visa', totalDue: 24500, minDue: 2450,
//     dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
//     categories: [
//       { name: 'Food & Dining', amount: 8500 },
//       { name: 'Shopping', amount: 6200 },
//       { name: 'Travel', amount: 5300 },
//       { name: 'Bills & Utilities', amount: 4500 },
//     ],
//     transactions: [
//       { merchant: 'Swiggy', amount: 450, category: 'food', date: new Date().toISOString() },
//       { merchant: 'Amazon', amount: 2100, category: 'shopping', date: new Date().toISOString() },
//     ]
//   }]
// });
```

## 🎯 Key Takeaways
- CRED FE interviews center on **fintech/credit card UX** — bills, payments, analytics
- Canvas donut chart with inner radius creates the hollow center for text
- Card-styled selector with gradient backgrounds — polish matters at CRED
- Quick pay buttons (min due / total due) plus custom amount reduces decision friction
- Date-grouped transaction list with category icons matches real credit card apps
- Indian currency formatting with `toLocaleString('en-IN')` handles lakhs/crores

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| JS Fundamentals | Medium | Closures, Async, WeakMap |
| Machine Coding | Medium-Hard | Canvas, DOM, State Management |
| FE System Design | Hard | Fintech Dashboard Architecture |
| HM | Medium | Product Sense, Culture |
