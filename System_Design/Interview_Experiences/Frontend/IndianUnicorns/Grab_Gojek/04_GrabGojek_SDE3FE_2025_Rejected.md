# Grab/Gojek — Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Grab/Gojek |
| **Role** | Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | May 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Frontend Machine Coding — Multi-Currency Wallet Dashboard

### Problem
Build a digital wallet dashboard:
1. Balance display with currency selector (SGD, IDR, INR, USD)
2. Quick-action buttons: Top Up, Transfer, Pay, Request
3. Transaction history list with date grouping and infinite scroll
4. Currency converter calculator (live exchange rate simulation)
5. Spending category breakdown (horizontal bar chart)
6. Toggle between light/dark theme
7. Transaction filter: All, Credits, Debits

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Wallet Dashboard</title>
<style>
:root { --bg: #f1f5f9; --card: #fff; --text: #0f172a; --sub: #64748b; --border: #e2e8f0; --accent: #2563eb; }
[data-theme="dark"] { --bg: #0f172a; --card: #1e293b; --text: #e2e8f0; --sub: #94a3b8; --border: #334155; --accent: #3b82f6; }

* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: var(--bg); max-width: 420px; margin: 0 auto; min-height: 100vh; transition: background 0.3s; color: var(--text); }

.header { display: flex; justify-content: space-between; padding: 16px 20px; align-items: center; }
.header h2 { font-size: 18px; }
.theme-toggle { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 6px 12px; font-size: 14px; cursor: pointer; }

/* Balance Card */
.balance-card { margin: 0 16px 16px; background: linear-gradient(135deg, var(--accent), #7c3aed); border-radius: 14px; padding: 20px; color: #fff; }
.balance-label { font-size: 12px; opacity: 0.8; }
.balance-amount { font-size: 30px; font-weight: 700; margin: 6px 0; }
.currency-select { background: rgba(255,255,255,.2); border: none; color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.currency-select option { color: #000; }

/* Quick Actions */
.quick-actions { display: flex; justify-content: space-around; padding: 0 16px 16px; }
.qa-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; }
.qa-icon { width: 44px; height: 44px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: 0.2s; }
.qa-icon:hover { background: var(--accent); color: #fff; border-color: var(--accent); }
.qa-label { font-size: 10px; color: var(--sub); }

/* Converter */
.converter { margin: 0 16px 16px; background: var(--card); border-radius: 10px; padding: 14px; border: 1px solid var(--border); }
.converter h3 { font-size: 13px; margin-bottom: 8px; }
.converter-row { display: flex; gap: 8px; align-items: center; }
.converter input { flex: 1; padding: 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; background: var(--bg); color: var(--text); }
.converter select { padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text); }
.converter-result { margin-top: 8px; font-size: 14px; font-weight: 600; text-align: center; }

/* Spending Chart */
.spending { margin: 0 16px 16px; background: var(--card); border-radius: 10px; padding: 14px; border: 1px solid var(--border); }
.spending h3 { font-size: 13px; margin-bottom: 10px; }
.bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.bar-cat { font-size: 11px; color: var(--sub); width: 60px; text-align: right; }
.bar-track { flex: 1; height: 16px; background: var(--bg); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
.bar-amt { font-size: 11px; color: var(--text); width: 50px; }

/* Filters */
.filter-row { display: flex; gap: 6px; padding: 0 16px 10px; }
.filter-chip { padding: 6px 14px; border-radius: 16px; font-size: 11px; cursor: pointer; border: 1px solid var(--border); background: var(--card); color: var(--sub); transition: 0.2s; }
.filter-chip.active { background: var(--accent); color: #fff; border-color: var(--accent); }

/* Transactions */
.txn-section { padding: 0 16px 80px; }
.txn-date-group { font-size: 11px; color: var(--sub); margin: 12px 0 4px; font-weight: 600; }
.txn-item { display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--card); border-radius: 8px; margin-bottom: 4px; border: 1px solid var(--border); }
.txn-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.txn-info { flex: 1; }
.txn-name { font-size: 13px; font-weight: 500; }
.txn-desc { font-size: 11px; color: var(--sub); }
.txn-amount { font-size: 14px; font-weight: 700; }
.txn-credit { color: #16a34a; }
.txn-debit { color: #dc2626; }
.loading-spinner { text-align: center; padding: 16px; font-size: 12px; color: var(--sub); }
</style>
</head>
<body>

<div class="header">
  <h2>💳 Wallet</h2>
  <button class="theme-toggle" id="themeBtn">🌙</button>
</div>

<div class="balance-card">
  <div class="balance-label">Available Balance</div>
  <div class="balance-amount" id="balanceAmt">S$ 4,250.00</div>
  <select class="currency-select" id="currencySelect">
    <option value="SGD">SGD</option>
    <option value="IDR">IDR</option>
    <option value="INR">INR</option>
    <option value="USD">USD</option>
  </select>
</div>

<div class="quick-actions">
  <div class="qa-btn"><div class="qa-icon">💰</div><div class="qa-label">Top Up</div></div>
  <div class="qa-btn"><div class="qa-icon">↗️</div><div class="qa-label">Transfer</div></div>
  <div class="qa-btn"><div class="qa-icon">📱</div><div class="qa-label">Pay</div></div>
  <div class="qa-btn"><div class="qa-icon">📨</div><div class="qa-label">Request</div></div>
</div>

<div class="converter">
  <h3>💱 Currency Converter</h3>
  <div class="converter-row">
    <input type="number" id="convAmt" placeholder="Amount" value="100">
    <select id="convFrom"><option>SGD</option><option>INR</option><option>IDR</option><option>USD</option></select>
    <span>→</span>
    <select id="convTo"><option>INR</option><option>SGD</option><option>IDR</option><option>USD</option></select>
  </div>
  <div class="converter-result" id="convResult">= ₹ 6,150.00</div>
</div>

<div class="spending">
  <h3>📊 Monthly Spending</h3>
  <div id="spendingChart"></div>
</div>

<div class="filter-row" id="filterRow"></div>
<div class="txn-section" id="txnSection"></div>

<script>
// ============================================================
// EXCHANGE RATES (simulated)
// ============================================================
const rates = { SGD: { INR: 61.5, IDR: 11200, USD: 0.74, SGD: 1 }, INR: { SGD: 0.016, IDR: 182, USD: 0.012, INR: 1 }, IDR: { SGD: 0.000089, INR: 0.0055, USD: 0.000066, IDR: 1 }, USD: { SGD: 1.35, INR: 83.2, IDR: 15200, USD: 1 } };
const symbols = { SGD: 'S$', INR: '₹', IDR: 'Rp', USD: '$' };
const baseBalance = 4250; // in SGD

// ============================================================
// CURRENCY & BALANCE
// ============================================================
function updateBalance() {
  const currency = document.getElementById('currencySelect').value;
  const converted = baseBalance * (rates.SGD[currency] || 1);
  document.getElementById('balanceAmt').textContent =
    `${symbols[currency]} ${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
document.getElementById('currencySelect').addEventListener('change', updateBalance);

// ============================================================
// CONVERTER
// ============================================================
function updateConverter() {
  const amt = parseFloat(document.getElementById('convAmt').value) || 0;
  const from = document.getElementById('convFrom').value;
  const to = document.getElementById('convTo').value;
  const rate = rates[from]?.[to] || 1;
  const result = amt * rate;
  document.getElementById('convResult').textContent =
    `= ${symbols[to]} ${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
document.getElementById('convAmt').addEventListener('input', updateConverter);
document.getElementById('convFrom').addEventListener('change', updateConverter);
document.getElementById('convTo').addEventListener('change', updateConverter);
updateConverter();

// ============================================================
// SPENDING CHART
// ============================================================
function renderSpending() {
  const categories = [
    { name: 'Food', amount: 820, color: '#f97316' },
    { name: 'Transport', amount: 450, color: '#2563eb' },
    { name: 'Shopping', amount: 340, color: '#7c3aed' },
    { name: 'Bills', amount: 680, color: '#16a34a' },
    { name: 'Others', amount: 210, color: '#94a3b8' }
  ];
  const max = Math.max(...categories.map(c => c.amount));
  document.getElementById('spendingChart').innerHTML = categories.map(c => `
    <div class="bar-row">
      <div class="bar-cat">${c.name}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(c.amount / max) * 100}%;background:${c.color}"></div></div>
      <div class="bar-amt">S$${c.amount}</div>
    </div>
  `).join('');
}
renderSpending();

// ============================================================
// TRANSACTIONS
// ============================================================
function generateTxns(page) {
  const types = [
    { name: 'GrabFood Order', desc: 'Biryani House', icon: '🍔', bg: '#fee2e2', type: 'debit' },
    { name: 'Cashback Reward', desc: 'GrabPay points', icon: '🎁', bg: '#dcfce7', type: 'credit' },
    { name: 'GrabRide', desc: 'MG Road → Airport', icon: '🚗', bg: '#e0f2fe', type: 'debit' },
    { name: 'Top Up', desc: 'UPI *4321', icon: '💰', bg: '#fef3c7', type: 'credit' },
    { name: 'GrabMart', desc: 'BigBasket delivery', icon: '🛒', bg: '#e0e7ff', type: 'debit' },
    { name: 'Transfer In', desc: 'From Rahul K.', icon: '📨', bg: '#dcfce7', type: 'credit' }
  ];

  return Array.from({ length: 8 }, (_, i) => {
    const t = types[(page * 8 + i) % types.length];
    const daysAgo = page * 3 + Math.floor(i / 3);
    const date = new Date(Date.now() - daysAgo * 86400000);
    return { ...t, amount: Math.round(50 + Math.random() * 500), date };
  });
}

let currentFilter = 'all';
let txnPage = 0;
let allTxns = [];
let isLoading = false;

function renderFilters() {
  const filters = ['All', 'Credits', 'Debits'];
  document.getElementById('filterRow').innerHTML = filters.map(f => {
    const key = f.toLowerCase();
    return `<div class="filter-chip${currentFilter === key ? ' active' : ''}" data-filter="${key}">${f}</div>`;
  }).join('');

  document.querySelectorAll('.filter-chip').forEach(c => {
    c.addEventListener('click', () => {
      currentFilter = c.dataset.filter;
      renderFilters();
      renderTxnList();
    });
  });
}

function renderTxnList() {
  const filtered = allTxns.filter(t => {
    if (currentFilter === 'credits') return t.type === 'credit';
    if (currentFilter === 'debits') return t.type === 'debit';
    return true;
  });

  // Group by date
  const groups = {};
  filtered.forEach(t => {
    const key = t.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  const section = document.getElementById('txnSection');
  section.innerHTML = Object.entries(groups).map(([date, txns]) => `
    <div class="txn-date-group">${date}</div>
    ${txns.map(t => `
      <div class="txn-item">
        <div class="txn-icon" style="background:${t.bg}">${t.icon}</div>
        <div class="txn-info">
          <div class="txn-name">${t.name}</div>
          <div class="txn-desc">${t.desc}</div>
        </div>
        <div class="txn-amount ${t.type === 'credit' ? 'txn-credit' : 'txn-debit'}">
          ${t.type === 'credit' ? '+' : '-'} S$${t.amount}
        </div>
      </div>
    `).join('')}
  `).join('') + '<div class="loading-spinner" id="loadMore">Loading more...</div>';
}

function loadMoreTxns() {
  if (isLoading) return;
  isLoading = true;
  setTimeout(() => {
    allTxns.push(...generateTxns(txnPage));
    txnPage++;
    renderTxnList();
    isLoading = false;
  }, 400);
}

// Infinite scroll
const observer = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) loadMoreTxns();
}, { rootMargin: '100px' });

// ============================================================
// THEME TOGGLE
// ============================================================
document.getElementById('themeBtn').addEventListener('click', () => {
  const isDark = document.documentElement.toggleAttribute('data-theme');
  document.getElementById('themeBtn').textContent = document.documentElement.hasAttribute('data-theme') ? '☀️' : '🌙';
});

// ============================================================
// INIT
// ============================================================
renderFilters();
loadMoreTxns(); // first page
setTimeout(() => {
  const loadEl = document.getElementById('loadMore');
  if (loadEl) observer.observe(loadEl);
}, 500);
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Got rejected — didn't implement **dark theme for all subcomponents** properly on first pass
- CSS variables (`--bg`, `--card`, `--text`) for theme toggling — `[data-theme="dark"]` override
- Currency converter: cross-rate lookup table, format with `toLocaleString`
- Balance converts using SGD base rate × selected currency rate
- Horizontal bar chart: `width` percentage proportional to max category
- Transaction infinite scroll: IntersectionObserver on "Loading more..." sentinel
- Filter chips: `currentFilter` state controls which transactions render

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Logic, Algorithms |
| Technical 1 | Medium | CSS Variables, Theme Toggle |
| Technical 2 | Hard | Multi-Currency, InfiniteScroll, Charts |
| Hiring Manager | Medium | Fintech, Super-App |
