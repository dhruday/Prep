# Paytm — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Paytm |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Frontend Machine Coding — Digital Wallet UI with Transaction History

### Problem
Build a digital wallet interface with:
1. Wallet balance card with animated number counter
2. Quick action buttons: Send, Receive, Scan, Recharge
3. Transaction history list with infinite scroll
4. Filter transactions by type (debit/credit) and date range
5. Send money flow with amount input and PIN confirmation
6. Transaction receipt that can be shared (copy)
7. Balance amount revealed/hidden toggle

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Paytm Wallet</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #00baf2; min-height: 100vh; display: flex; justify-content: center; }

.app { width: 400px; min-height: 100vh; background: #f5f5f5; position: relative; }

/* Balance Card */
.balance-card { background: linear-gradient(135deg, #002970, #00baf2); padding: 24px 20px; color: #fff; }
.balance-header { display: flex; justify-content: space-between; align-items: center; }
.greeting { font-size: 14px; opacity: 0.8; }
.balance-label { font-size: 12px; letter-spacing: 1px; margin-top: 16px; opacity: 0.7; }
.balance-amount { font-size: 32px; font-weight: 700; margin-top: 4px; transition: opacity 0.3s; display: flex; align-items: center; gap: 10px; }
.eye-btn { background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; opacity: 0.7; }
.eye-btn:hover { opacity: 1; }
.hidden-amount { letter-spacing: 4px; }

/* Quick Actions */
.quick-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px 20px; margin-top: -20px; }
.action-btn { background: #fff; border-radius: 12px; padding: 14px 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); cursor: pointer; transition: transform 0.1s; border: none; font-family: inherit; }
.action-btn:hover { transform: translateY(-2px); }
.action-icon { font-size: 24px; margin-bottom: 4px; }
.action-label { font-size: 11px; font-weight: 600; color: #374151; }

/* Filters */
.filter-section { padding: 8px 20px; display: flex; gap: 6px; flex-wrap: wrap; }
.filter-chip { padding: 4px 12px; border: 1px solid #ddd; border-radius: 16px; font-size: 12px; cursor: pointer; background: #fff; }
.filter-chip.active { background: #002970; color: #fff; border-color: #002970; }

/* Transactions */
.txn-section { padding: 0 20px; }
.txn-header { font-size: 14px; font-weight: 600; color: #374151; padding: 12px 0 8px; display: flex; justify-content: space-between; }
.txn-list { background: #fff; border-radius: 10px; overflow: hidden; }
.txn-item { display: flex; align-items: center; gap: 10px; padding: 12px; border-bottom: 1px solid #f5f5f5; cursor: pointer; }
.txn-item:last-child { border-bottom: none; }
.txn-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.txn-icon.credit { background: #dcfce7; }
.txn-icon.debit { background: #fee2e2; }
.txn-info { flex: 1; }
.txn-name { font-size: 14px; font-weight: 500; }
.txn-time { font-size: 11px; color: #9ca3af; }
.txn-amount { font-size: 15px; font-weight: 600; }
.txn-amount.credit { color: #16a34a; }
.txn-amount.debit { color: #dc2626; }

.txn-loading { text-align: center; padding: 16px; font-size: 13px; color: #9ca3af; }

/* Send Money Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; z-index: 100; }
.modal-sheet { background: #fff; width: 400px; border-radius: 16px 16px 0 0; padding: 24px; animation: slideUp 0.3s ease; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.modal-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
.modal-input { width: 100%; padding: 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 16px; margin-bottom: 12px; outline: none; text-align: center; }
.modal-input:focus { border-color: #00baf2; }
.amount-display { font-size: 36px; font-weight: 700; text-align: center; margin: 12px 0; color: #002970; }
.pin-dots { display: flex; justify-content: center; gap: 12px; margin: 16px 0; }
.pin-dot { width: 14px; height: 14px; border: 2px solid #d1d5db; border-radius: 50%; }
.pin-dot.filled { background: #002970; border-color: #002970; }
.numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.numpad button { padding: 14px; border: none; background: #f3f4f6; border-radius: 10px; font-size: 20px; font-weight: 500; cursor: pointer; }
.numpad button:hover { background: #e5e7eb; }
.numpad .confirm { background: #00baf2; color: #fff; }
.numpad .confirm:hover { background: #0099cc; }

/* Receipt */
.receipt { text-align: center; padding: 20px; }
.receipt-check { font-size: 48px; margin-bottom: 12px; }
.receipt-amount { font-size: 28px; font-weight: 700; color: #16a34a; }
.receipt-to { font-size: 14px; color: #6b7280; margin: 8px 0; }
.receipt-id { font-size: 12px; color: #9ca3af; margin-bottom: 16px; }
.share-btn { padding: 10px 24px; background: #002970; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
.close-btn { padding: 10px 24px; background: #f3f4f6; color: #374151; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; margin-left: 8px; }
</style>
</head>
<body>
<div class="app">
  <div class="balance-card" id="balanceCard"></div>
  <div class="quick-actions" id="quickActions"></div>
  <div class="filter-section" id="filters"></div>
  <div class="txn-section" id="txnSection"></div>
</div>

<script>
// ============================================================
// DATA
// ============================================================
const TRANSACTIONS = Array.from({ length: 60 }, (_, i) => ({
  id: `TXN${String(1000 + i).padStart(6, '0')}`,
  name: ['Flipkart', 'Swiggy', 'Amazon', 'Uber', 'Electricity Bill', 'Salary Credit', 'Rent', 'Netflix', 'Recharge', 'Friend - Rahul'][i % 10],
  type: i % 3 === 0 ? 'credit' : 'debit',
  amount: Math.round(50 + Math.random() * 5000),
  emoji: ['🛍️', '🍔', '📦', '🚗', '💡', '💰', '🏠', '🎬', '📱', '👤'][i % 10],
  time: new Date(Date.now() - i * 3600000 * 4),
  category: ['shopping', 'food', 'shopping', 'travel', 'bills', 'income', 'bills', 'entertainment', 'recharge', 'transfer'][i % 10]
}));

// ============================================================
// STATE
// ============================================================
let balance = 24567.50;
let balanceVisible = true;
let txnFilter = 'all'; // all, credit, debit
let txnPage = 0;
const PAGE_SIZE = 10;
let loading = false;

// ============================================================
// BALANCE CARD
// ============================================================
function renderBalance() {
  document.getElementById('balanceCard').innerHTML = `
    <div class="balance-header">
      <span class="greeting">Hi, User 👋</span>
    </div>
    <div class="balance-label">WALLET BALANCE</div>
    <div class="balance-amount">
      ${balanceVisible ? `₹${animateNumber(balance)}` : '<span class="hidden-amount">••••••</span>'}
      <button class="eye-btn" id="eyeBtn">${balanceVisible ? '👁️' : '👁️‍🗨️'}</button>
    </div>
  `;
  document.getElementById('eyeBtn').addEventListener('click', () => {
    balanceVisible = !balanceVisible;
    renderBalance();
  });
}

function animateNumber(num) {
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============================================================
// QUICK ACTIONS
// ============================================================
function renderActions() {
  const actions = [
    { icon: '💸', label: 'Send', action: openSendModal },
    { icon: '📥', label: 'Receive', action: () => alert('Receive QR coming soon!') },
    { icon: '📷', label: 'Scan', action: () => alert('Camera access needed') },
    { icon: '📱', label: 'Recharge', action: () => alert('Recharge coming soon!') }
  ];
  const el = document.getElementById('quickActions');
  el.innerHTML = actions.map((a, i) => `
    <button class="action-btn" data-idx="${i}">
      <div class="action-icon">${a.icon}</div>
      <div class="action-label">${a.label}</div>
    </button>
  `).join('');
  el.querySelectorAll('.action-btn').forEach((btn, i) => {
    btn.addEventListener('click', actions[i].action);
  });
}

// ============================================================
// FILTERS
// ============================================================
function renderFilters() {
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'credit', label: '💰 Credit' },
    { key: 'debit', label: '💸 Debit' }
  ];
  const el = document.getElementById('filters');
  el.innerHTML = filters.map(f =>
    `<span class="filter-chip ${txnFilter === f.key ? 'active' : ''}" data-key="${f.key}">${f.label}</span>`
  ).join('');
  el.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      txnFilter = chip.dataset.key;
      txnPage = 0;
      renderFilters();
      renderTransactions();
    });
  });
}

// ============================================================
// TRANSACTIONS
// ============================================================
function getFilteredTxns() {
  if (txnFilter === 'all') return TRANSACTIONS;
  return TRANSACTIONS.filter(t => t.type === txnFilter);
}

function renderTransactions(append = false) {
  const section = document.getElementById('txnSection');
  const filtered = getFilteredTxns();
  const start = 0;
  const end = (txnPage + 1) * PAGE_SIZE;
  const visible = filtered.slice(start, end);

  let html = '<div class="txn-header"><span>Transactions</span><span>' + filtered.length + ' total</span></div>';
  html += '<div class="txn-list" id="txnList">';

  visible.forEach(t => {
    const sign = t.type === 'credit' ? '+' : '-';
    html += `
      <div class="txn-item" data-id="${t.id}">
        <div class="txn-icon ${t.type}">${t.emoji}</div>
        <div class="txn-info">
          <div class="txn-name">${t.name}</div>
          <div class="txn-time">${formatTime(t.time)}</div>
        </div>
        <div class="txn-amount ${t.type}">${sign}₹${t.amount.toLocaleString('en-IN')}</div>
      </div>
    `;
  });

  if (end < filtered.length) {
    html += '<div class="txn-loading" id="txnLoader">Loading more...</div>';
  }
  html += '</div>';
  section.innerHTML = html;

  // Infinite scroll observer
  const loader = document.getElementById('txnLoader');
  if (loader) {
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) {
        loading = true;
        setTimeout(() => {
          txnPage++;
          renderTransactions();
          loading = false;
        }, 500);
      }
    });
    obs.observe(loader);
  }

  // Click to show receipt
  section.querySelectorAll('.txn-item').forEach(item => {
    item.addEventListener('click', () => {
      const txn = TRANSACTIONS.find(t => t.id === item.dataset.id);
      if (txn) showReceipt(txn);
    });
  });
}

function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' hr ago';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ============================================================
// SEND MONEY MODAL
// ============================================================
function openSendModal() {
  let step = 'amount'; // amount | pin | success
  let amount = '';
  let pin = '';
  let recipient = 'Rahul Kumar (+91 98765 43210)';

  function render() {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    if (step === 'amount') {
      overlay.innerHTML = `<div class="modal-sheet">
        <div class="modal-title">Send Money</div>
        <input class="modal-input" placeholder="Enter recipient" value="${recipient}" id="recipient">
        <div class="amount-display" id="amtDisplay">₹${amount || '0'}</div>
        <div class="numpad" id="numpad">
          ${[1,2,3,4,5,6,7,8,9,'.',0,'⌫'].map(n =>
            `<button data-val="${n}">${n}</button>`
          ).join('')}
        </div>
        <button class="share-btn" style="width:100%;margin-top:12px;" id="proceedBtn" ${!amount ? 'disabled' : ''}>Proceed to Pay</button>
      </div>`;
    } else if (step === 'pin') {
      overlay.innerHTML = `<div class="modal-sheet">
        <div class="modal-title">Enter Wallet PIN</div>
        <div class="pin-dots">
          ${[0,1,2,3].map(i => `<div class="pin-dot ${i < pin.length ? 'filled' : ''}"></div>`).join('')}
        </div>
        <div class="numpad" id="numpad">
          ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(n =>
            n === '' ? '<button disabled></button>' : `<button data-val="${n}">${n}</button>`
          ).join('')}
        </div>
      </div>`;
    } else {
      overlay.innerHTML = `<div class="modal-sheet">
        <div class="receipt">
          <div class="receipt-check">✅</div>
          <div class="receipt-amount">₹${parseFloat(amount).toLocaleString('en-IN')}</div>
          <div class="receipt-to">Sent to ${recipient}</div>
          <div class="receipt-id">TXN ID: TXN${Date.now().toString().slice(-8)}</div>
          <button class="share-btn" id="shareBtn">📋 Copy Receipt</button>
          <button class="close-btn" id="closeBtn">Done</button>
        </div>
      </div>`;
    }

    document.body.appendChild(overlay);

    // Listeners
    if (step === 'amount') {
      overlay.querySelector('#numpad').addEventListener('click', (e) => {
        const val = e.target.dataset.val;
        if (val === undefined) return;
        if (val === '⌫') amount = amount.slice(0, -1);
        else if (val === '.' && amount.includes('.')) return;
        else if (amount.length < 8) amount += val;
        overlay.querySelector('#amtDisplay').textContent = '₹' + (amount || '0');
        overlay.querySelector('#proceedBtn').disabled = !amount || parseFloat(amount) === 0;
      });
      overlay.querySelector('#proceedBtn').addEventListener('click', () => {
        if (parseFloat(amount) > balance) { alert('Insufficient balance'); return; }
        step = 'pin'; render();
      });
    } else if (step === 'pin') {
      overlay.querySelector('#numpad').addEventListener('click', (e) => {
        const val = e.target.dataset.val;
        if (val === undefined) return;
        if (val === '⌫') pin = pin.slice(0, -1);
        else if (pin.length < 4) pin += val;
        if (pin.length === 4) {
          // "Verify" PIN (always accept in demo)
          balance -= parseFloat(amount);
          step = 'success'; render();
          renderBalance();
          return;
        }
        render();
      });
    } else {
      overlay.querySelector('#shareBtn').addEventListener('click', () => {
        const text = `Payment Receipt\nAmount: ₹${amount}\nTo: ${recipient}\nDate: ${new Date().toLocaleString()}\nStatus: Success`;
        navigator.clipboard.writeText(text);
        overlay.querySelector('#shareBtn').textContent = '✓ Copied!';
      });
      overlay.querySelector('#closeBtn').addEventListener('click', () => {
        overlay.remove();
        renderTransactions();
      });
    }

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  render();
}

function showReceipt(txn) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-sheet">
    <div class="receipt">
      <div class="receipt-check">${txn.emoji}</div>
      <div class="receipt-amount ${txn.type}">${txn.type === 'credit' ? '+' : '-'}₹${txn.amount.toLocaleString('en-IN')}</div>
      <div class="receipt-to">${txn.name}</div>
      <div class="receipt-id">${txn.id} • ${txn.time.toLocaleString()}</div>
      <button class="share-btn" id="shareBtn">📋 Copy</button>
      <button class="close-btn" id="closeBtn">Close</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('#shareBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(`${txn.name} | ${txn.type === 'credit' ? '+' : '-'}₹${txn.amount} | ${txn.id}`);
    overlay.querySelector('#shareBtn').textContent = '✓ Copied!';
  });
  overlay.querySelector('#closeBtn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// Initial render
renderBalance();
renderActions();
renderFilters();
renderTransactions();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Paytm FE interviews focus on **fintech UX**: wallet balance, payments, transaction history
- Balance hide/reveal toggle: `balanceVisible` flag switches between formatted number and dots
- **Numpad for amount input**: custom grid, no native keyboard — matches mobile wallet UX
- PIN entry: 4 dots filling up, auto-proceed at length 4 — clean authentication UX
- Transaction receipt with clipboard sharing via `navigator.clipboard.writeText`
- Infinite scroll: IntersectionObserver on loader element, increment page on intersection
- Filter chips: multi-type (credit/debit/all), re-render list on filter change with reset to page 0
- Relative timestamps: "X min ago", "Y hr ago", date — `Date.now() - txn.time` calculation

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Strings |
| Technical 1 | Medium | DOM, Event Handling |
| Technical 2 | Hard | Wallet UI, Payment Flow, Numpad |
| Hiring Manager | Medium | Fintech, Payment Products |
