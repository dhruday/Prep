# Paytm — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Paytm |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Noida |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 3: Frontend Machine Coding — Bill Splitting App

### Problem
Build a bill splitting application:
1. Add participants with names
2. Add expenses with amount, payer, and split-among selection
3. Split types: equal, exact amounts, percentage
4. Calculate settlement: who owes whom and how much
5. Minimize number of transactions (debt simplification)
6. Visual debt graph showing flows
7. Export settlement summary

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Bill Splitter</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f0f4ff; min-height: 100vh; padding: 24px; }

.container { max-width: 700px; margin: 0 auto; }
h1 { font-size: 24px; color: #1e293b; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card h3 { font-size: 16px; color: #334155; margin-bottom: 12px; }

/* Participants */
.add-row { display: flex; gap: 8px; margin-bottom: 12px; }
.add-row input { flex: 1; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
.add-row button { padding: 8px 16px; background: #3b82f6; color: #fff; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
.participant-list { display: flex; flex-wrap: wrap; gap: 6px; }
.participant-tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: #e0e7ff; color: #3b82f6; border-radius: 16px; font-size: 13px; }
.participant-tag button { background: none; border: none; color: #93a3b8; cursor: pointer; font-size: 14px; }

/* Expense Form */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.form-field label { display: block; font-size: 12px; font-weight: 500; color: #64748b; margin-bottom: 4px; }
.form-field input, .form-field select { width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; }
.form-field.full { grid-column: 1 / -1; }
.split-options { display: flex; gap: 6px; margin-bottom: 10px; }
.split-opt { padding: 5px 12px; border: 1px solid #d1d5db; border-radius: 16px; font-size: 12px; cursor: pointer; background: #fff; }
.split-opt.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.check-list { display: flex; flex-wrap: wrap; gap: 8px; }
.check-item { display: flex; align-items: center; gap: 4px; font-size: 13px; }
.check-item input[type="checkbox"] { accent-color: #3b82f6; }
.check-item input[type="number"] { width: 70px; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; }
.add-expense-btn { width: 100%; padding: 10px; background: #10b981; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }

/* Expense List */
.expense-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.expense-item:last-child { border-bottom: none; }
.exp-desc { font-size: 14px; font-weight: 500; }
.exp-meta { font-size: 12px; color: #94a3b8; }
.exp-amount { font-size: 15px; font-weight: 600; color: #1e293b; }

/* Settlements */
.settlement-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 6px; font-size: 14px; }
.settlement-arrow { color: #3b82f6; font-weight: 600; }
.settlement-amount { font-weight: 700; color: #10b981; }
.no-data { text-align: center; padding: 20px; color: #94a3b8; font-size: 13px; }

/* Debt Graph */
.graph { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; padding: 16px 0; }
.graph-node { width: 60px; height: 60px; border-radius: 50%; background: #e0e7ff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #3b82f6; text-align: center; position: relative; }
.graph-node.positive { background: #dcfce7; color: #16a34a; }
.graph-node.negative { background: #fee2e2; color: #dc2626; }
.balance-text { font-size: 10px; position: absolute; bottom: -14px; color: #64748b; white-space: nowrap; }

.export-btn { padding: 8px 16px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; float: right; }
</style>
</head>
<body>
<div class="container">
  <h1>💰 Split Bills</h1>
  <div class="card" id="participantsCard"></div>
  <div class="card" id="expenseForm"></div>
  <div class="card" id="expenseList"></div>
  <div class="card" id="settlements"></div>
</div>

<script>
// ============================================================
// STATE
// ============================================================
let participants = ['Alice', 'Bob', 'Charlie'];
let expenses = [];
let splitType = 'equal'; // equal, exact, percentage

// ============================================================
// PARTICIPANTS
// ============================================================
function renderParticipants() {
  const card = document.getElementById('participantsCard');
  card.innerHTML = `
    <h3>👥 Participants</h3>
    <div class="add-row">
      <input type="text" id="nameInput" placeholder="Add participant" maxlength="20">
      <button id="addParticipant">Add</button>
    </div>
    <div class="participant-list">
      ${participants.map(p => `
        <span class="participant-tag">${p}
          <button data-name="${p}">×</button>
        </span>
      `).join('')}
    </div>
  `;

  card.querySelector('#addParticipant').addEventListener('click', () => {
    const input = card.querySelector('#nameInput');
    const name = input.value.trim();
    if (name && !participants.includes(name)) {
      participants.push(name);
      renderAll();
    }
    input.value = '';
    input.focus();
  });
  card.querySelector('#nameInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') card.querySelector('#addParticipant').click();
  });
  card.querySelectorAll('.participant-tag button').forEach(btn => {
    btn.addEventListener('click', () => {
      participants = participants.filter(p => p !== btn.dataset.name);
      renderAll();
    });
  });
}

// ============================================================
// EXPENSE FORM
// ============================================================
function renderExpenseForm() {
  const card = document.getElementById('expenseForm');
  card.innerHTML = `
    <h3>➕ Add Expense</h3>
    <div class="form-grid">
      <div class="form-field">
        <label>Description</label>
        <input type="text" id="expDesc" placeholder="e.g., Dinner">
      </div>
      <div class="form-field">
        <label>Amount (₹)</label>
        <input type="number" id="expAmount" placeholder="0" min="0">
      </div>
      <div class="form-field">
        <label>Paid By</label>
        <select id="expPayer">
          ${participants.map(p => `<option>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-field">
        <label>Split Type</label>
        <div class="split-options">
          ${['equal', 'exact', 'percentage'].map(t =>
            `<span class="split-opt ${splitType === t ? 'active' : ''}" data-type="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</span>`
          ).join('')}
        </div>
      </div>
      <div class="form-field full">
        <label>Split Among</label>
        <div class="check-list" id="splitCheckList">
          ${participants.map(p => `
            <div class="check-item">
              <input type="checkbox" checked data-name="${p}" class="split-check">
              <span>${p}</span>
              ${splitType !== 'equal' ? `<input type="number" data-name="${p}" class="split-val" placeholder="${splitType === 'percentage' ? '%' : '₹'}" min="0">` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <button class="add-expense-btn" id="addExpenseBtn">Add Expense</button>
  `;

  card.querySelectorAll('.split-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      splitType = opt.dataset.type;
      renderExpenseForm();
    });
  });

  card.querySelector('#addExpenseBtn').addEventListener('click', () => {
    const desc = card.querySelector('#expDesc').value.trim();
    const amount = parseFloat(card.querySelector('#expAmount').value);
    const payer = card.querySelector('#expPayer').value;

    if (!desc || !amount || amount <= 0) { alert('Enter description and amount'); return; }

    const checked = [...card.querySelectorAll('.split-check:checked')].map(c => c.dataset.name);
    if (checked.length === 0) { alert('Select at least one person'); return; }

    let splits = {};
    if (splitType === 'equal') {
      const share = amount / checked.length;
      checked.forEach(p => splits[p] = share);
    } else if (splitType === 'exact') {
      let total = 0;
      checked.forEach(p => {
        const val = parseFloat(card.querySelector(`.split-val[data-name="${p}"]`)?.value || 0);
        splits[p] = val;
        total += val;
      });
      if (Math.abs(total - amount) > 0.01) { alert(`Exact amounts must equal ₹${amount} (got ₹${total.toFixed(2)})`); return; }
    } else { // percentage
      let totalPct = 0;
      checked.forEach(p => {
        const pct = parseFloat(card.querySelector(`.split-val[data-name="${p}"]`)?.value || 0);
        splits[p] = (pct / 100) * amount;
        totalPct += pct;
      });
      if (Math.abs(totalPct - 100) > 0.01) { alert(`Percentages must equal 100% (got ${totalPct}%)`); return; }
    }

    expenses.push({ desc, amount, payer, splits, splitType, id: Date.now() });
    splitType = 'equal';
    renderAll();
  });
}

// ============================================================
// EXPENSE LIST
// ============================================================
function renderExpenseList() {
  const card = document.getElementById('expenseList');
  if (expenses.length === 0) {
    card.innerHTML = '<h3>📋 Expenses</h3><div class="no-data">No expenses yet</div>';
    return;
  }
  card.innerHTML = `
    <h3>📋 Expenses (${expenses.length})</h3>
    ${expenses.map(e => `
      <div class="expense-item">
        <div>
          <div class="exp-desc">${e.desc}</div>
          <div class="exp-meta">Paid by ${e.payer} • Split: ${e.splitType}</div>
        </div>
        <div class="exp-amount">₹${e.amount.toFixed(2)}</div>
      </div>
    `).join('')}
  `;
}

// ============================================================
// SETTLEMENT CALCULATION (DEBT SIMPLIFICATION)
// ============================================================
function calculateSettlements() {
  // Calculate net balance for each participant
  const balances = {};
  participants.forEach(p => balances[p] = 0);

  expenses.forEach(exp => {
    // Payer is owed money
    balances[exp.payer] = (balances[exp.payer] || 0) + exp.amount;
    // Each split person owes their share
    Object.entries(exp.splits).forEach(([person, share]) => {
      balances[person] = (balances[person] || 0) - share;
    });
  });

  // Debt simplification using greedy approach
  // Separate into creditors (positive balance) and debtors (negative balance)
  const creditors = []; // { name, amount }
  const debtors = [];

  Object.entries(balances).forEach(([name, bal]) => {
    if (bal > 0.01) creditors.push({ name, amount: bal });
    else if (bal < -0.01) debtors.push({ name, amount: -bal }); // store as positive
  });

  // Sort both descending for greedy matching
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const amount = Math.min(creditors[i].amount, debtors[j].amount);
    if (amount > 0.01) {
      settlements.push({
        from: debtors[j].name,
        to: creditors[i].name,
        amount: Math.round(amount * 100) / 100
      });
    }
    creditors[i].amount -= amount;
    debtors[j].amount -= amount;
    if (creditors[i].amount < 0.01) i++;
    if (debtors[j].amount < 0.01) j++;
  }

  return { settlements, balances };
}

function renderSettlements() {
  const card = document.getElementById('settlements');
  const { settlements, balances } = calculateSettlements();

  let html = '<h3>⚖️ Settlements <button class="export-btn" id="exportBtn">📋 Export</button></h3>';

  // Debt graph
  html += '<div class="graph">';
  participants.forEach(p => {
    const bal = balances[p] || 0;
    const cls = bal > 0.01 ? 'positive' : bal < -0.01 ? 'negative' : '';
    html += `<div class="graph-node ${cls}">
      ${p.substring(0, 3)}
      <span class="balance-text">${bal >= 0 ? '+' : ''}₹${bal.toFixed(0)}</span>
    </div>`;
  });
  html += '</div>';

  if (settlements.length === 0) {
    html += '<div class="no-data">All settled up! 🎉</div>';
  } else {
    settlements.forEach(s => {
      html += `<div class="settlement-item">
        <span>${s.from}</span>
        <span class="settlement-arrow">→ pays →</span>
        <span>${s.to}</span>
        <span class="settlement-amount">₹${s.amount.toFixed(2)}</span>
      </div>`;
    });
    html += `<div style="font-size:12px;color:#94a3b8;margin-top:8px;">${settlements.length} transaction(s) needed</div>`;
  }

  card.innerHTML = html;

  card.querySelector('#exportBtn')?.addEventListener('click', () => {
    const lines = ['Bill Settlement Summary', '---'];
    settlements.forEach(s => lines.push(`${s.from} → ${s.to}: ₹${s.amount.toFixed(2)}`));
    if (settlements.length === 0) lines.push('All settled up!');
    navigator.clipboard.writeText(lines.join('\n'));
    const btn = card.querySelector('#exportBtn');
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = '📋 Export', 1500);
  });
}

function renderAll() {
  renderParticipants();
  renderExpenseForm();
  renderExpenseList();
  renderSettlements();
}

renderAll();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Got rejected — interviewer wanted **multi-currency support** and **expense categorization with charts**
- **Debt simplification algorithm**: calculate net balance per person → separate creditors/debtors → greedy matching
- Three split types: equal (amount/N), exact (custom amounts summing to total), percentage (must sum to 100%)
- Settlement minimization: O(n log n) greedy with two sorted arrays — minimizes transactions
- Validation: exact split must equal expense amount; percentage must sum to 100%
- Balance graph: simple circles colored green (owed money), red (owes money) with net amounts
- Export: clipboard API formats settlements as text summary
- **Key insight**: Net balance calculation — payer gets +amount, each splitter gets -share

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Math |
| Technical 1 | Medium | DOM, Forms |
| Technical 2 | Hard | Settlement Algorithm, Multi-Split |
| Hiring Manager | Medium | Product Thinking, Fintech |
