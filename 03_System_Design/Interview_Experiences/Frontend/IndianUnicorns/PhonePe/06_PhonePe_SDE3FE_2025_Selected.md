# PhonePe — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | PhonePe |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Frontend Machine Coding — UPI Payment Flow with QR Scanner

### Problem
Build a UPI-style payment interface with:
1. Payment home with balance display and recent contacts
2. Pay by UPI ID or phone number input
3. Amount entry with numpad and quick amount chips
4. UPI PIN entry screen (4/6 digit with masked dots)
5. Payment processing animation (spinner with status)
6. Success/failure screen with transaction details
7. Recent transactions list with search

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PhonePe Payment</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #5f2dab; min-height: 100vh; display: flex; justify-content: center; }

.phone { width: 390px; min-height: 100vh; background: #fff; position: relative; overflow: hidden; }

/* Header */
.header { background: #5f2dab; padding: 16px 20px; color: #fff; }
.header-row { display: flex; justify-content: space-between; align-items: center; }
.header h2 { font-size: 18px; }
.back-btn { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }

/* Home Screen */
.balance-strip { background: linear-gradient(135deg, #5f2dab, #8b5cf6); padding: 20px; color: #fff; text-align: center; }
.bal-label { font-size: 12px; opacity: 0.7; }
.bal-value { font-size: 28px; font-weight: 700; margin: 4px 0; }

.pay-input-row { padding: 16px 20px; }
.pay-input { width: 100%; padding: 12px 16px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 15px; outline: none; }
.pay-input:focus { border-color: #5f2dab; }

.recent-contacts { padding: 0 20px; }
.section-title { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 10px; }
.contacts-grid { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 12px; }
.contact-item { text-align: center; cursor: pointer; min-width: 56px; }
.contact-avatar { width: 48px; height: 48px; border-radius: 50%; background: #ede9fe; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; color: #5f2dab; margin: 0 auto 4px; }
.contact-name { font-size: 11px; color: #6b7280; }

.quick-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px 20px; }
.qa-btn { background: #f3f4f6; border-radius: 10px; padding: 12px 4px; text-align: center; border: none; cursor: pointer; font-family: inherit; }
.qa-icon { font-size: 22px; }
.qa-label { font-size: 11px; color: #374151; margin-top: 4px; }

/* Amount Screen */
.amount-screen { padding: 24px 20px; text-align: center; }
.to-label { font-size: 13px; color: #6b7280; }
.to-name { font-size: 16px; font-weight: 600; margin: 4px 0 20px; }
.amount-display { font-size: 42px; font-weight: 700; color: #1f2937; margin-bottom: 8px; }
.amount-hint { font-size: 12px; color: #9ca3af; margin-bottom: 20px; }
.quick-chips { display: flex; justify-content: center; gap: 8px; margin-bottom: 20px; }
.chip { padding: 6px 16px; border: 1px solid #d1d5db; border-radius: 20px; font-size: 13px; cursor: pointer; background: #fff; }
.chip:hover { border-color: #5f2dab; }
.numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; max-width: 280px; margin: 0 auto; }
.numpad button { padding: 14px; border: none; background: #f3f4f6; border-radius: 10px; font-size: 20px; cursor: pointer; }
.numpad button:hover { background: #e5e7eb; }
.numpad .pay { background: #5f2dab; color: #fff; }
.numpad .pay:hover { background: #4c1d95; }
.numpad .pay:disabled { background: #d1d5db; }

/* PIN Screen */
.pin-screen { padding: 40px 20px; text-align: center; }
.pin-label { font-size: 16px; font-weight: 500; margin-bottom: 24px; }
.pin-dots { display: flex; justify-content: center; gap: 16px; margin-bottom: 30px; }
.pin-dot { width: 16px; height: 16px; border: 2px solid #d1d5db; border-radius: 50%; transition: all 0.15s; }
.pin-dot.filled { background: #5f2dab; border-color: #5f2dab; }
.pin-numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 260px; margin: 0 auto; }
.pin-numpad button { padding: 16px; border: none; background: #f8f9fa; border-radius: 12px; font-size: 22px; cursor: pointer; }
.pin-numpad button:hover { background: #e5e7eb; }

/* Processing */
.processing { text-align: center; padding: 60px 20px; }
@keyframes spin { to { transform: rotate(360deg); } }
.spinner { width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top-color: #5f2dab; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
.processing-text { font-size: 16px; color: #374151; }
.processing-sub { font-size: 13px; color: #9ca3af; margin-top: 4px; }

/* Result */
.result { text-align: center; padding: 40px 20px; }
.result-icon { font-size: 56px; margin-bottom: 12px; }
.result-amount { font-size: 28px; font-weight: 700; }
.result-amount.success { color: #16a34a; }
.result-amount.failure { color: #dc2626; }
.result-to { font-size: 14px; color: #6b7280; margin: 8px 0; }
.result-id { font-size: 12px; color: #9ca3af; padding: 8px; background: #f8f9fa; border-radius: 6px; margin: 16px 0; }
.result-btn { display: block; width: 100%; padding: 14px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; margin-bottom: 8px; }
.result-btn.primary { background: #5f2dab; color: #fff; border: none; }
.result-btn.secondary { background: #fff; color: #374151; border: 1px solid #d1d5db; }

/* Transactions */
.txn-section { padding: 0 20px 20px; }
.txn-search { width: 100%; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; margin-bottom: 10px; }
.txn-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.txn-avatar { width: 36px; height: 36px; border-radius: 50%; background: #ede9fe; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #5f2dab; font-weight: 600; flex-shrink: 0; }
.txn-info { flex: 1; }
.txn-name { font-size: 14px; font-weight: 500; }
.txn-time { font-size: 11px; color: #9ca3af; }
.txn-amt { font-size: 14px; font-weight: 600; }
.txn-amt.credit { color: #16a34a; }
.txn-amt.debit { color: #dc2626; }
</style>
</head>
<body>
<div class="phone" id="app"></div>

<script>
// ============================================================
// DATA
// ============================================================
const CONTACTS = [
  { name: 'Rahul', upi: 'rahul@upi', initials: 'RK' },
  { name: 'Priya', upi: 'priya@upi', initials: 'PS' },
  { name: 'Amit', upi: 'amit@upi', initials: 'AJ' },
  { name: 'Sneha', upi: 'sneha@upi', initials: 'SD' },
  { name: 'Vikram', upi: 'vikram@upi', initials: 'VR' },
  { name: 'Anita', upi: 'anita@upi', initials: 'AN' }
];

const TRANSACTIONS = Array.from({ length: 30 }, (_, i) => ({
  id: `UPI${String(Date.now() - i * 100000).slice(-10)}`,
  name: CONTACTS[i % CONTACTS.length].name,
  type: i % 3 === 0 ? 'credit' : 'debit',
  amount: Math.round(50 + Math.random() * 3000),
  time: new Date(Date.now() - i * 3600000 * 3),
  upi: CONTACTS[i % CONTACTS.length].upi
}));

let balance = 15678.50;

// ============================================================
// STATE & NAVIGATION
// ============================================================
let screen = 'home'; // home|amount|pin|processing|result
let payTo = null;
let payAmount = '';
let pin = '';
let paymentSuccess = true;
let txnSearch = '';

function navigate(newScreen) {
  screen = newScreen;
  render();
}

// ============================================================
// RENDER ROUTER
// ============================================================
function render() {
  const app = document.getElementById('app');
  switch (screen) {
    case 'home': renderHome(app); break;
    case 'amount': renderAmount(app); break;
    case 'pin': renderPin(app); break;
    case 'processing': renderProcessing(app); break;
    case 'result': renderResult(app); break;
  }
}

function renderHome(app) {
  const filtered = TRANSACTIONS.filter(t =>
    !txnSearch || t.name.toLowerCase().includes(txnSearch.toLowerCase())
  );

  app.innerHTML = `
    <div class="balance-strip">
      <div class="bal-label">WALLET BALANCE</div>
      <div class="bal-value">₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="pay-input-row">
      <input class="pay-input" id="payInput" placeholder="Enter UPI ID or phone number">
    </div>
    <div class="recent-contacts">
      <div class="section-title">Recent</div>
      <div class="contacts-grid">
        ${CONTACTS.map(c => `
          <div class="contact-item" data-upi="${c.upi}" data-name="${c.name}">
            <div class="contact-avatar">${c.initials}</div>
            <div class="contact-name">${c.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="quick-actions">
      ${[
        { icon: '📲', label: 'Scan QR' },
        { icon: '💳', label: 'Balance' },
        { icon: '📜', label: 'History' },
        { icon: '🏦', label: 'Bank' }
      ].map(a => `
        <button class="qa-btn"><div class="qa-icon">${a.icon}</div><div class="qa-label">${a.label}</div></button>
      `).join('')}
    </div>
    <div class="txn-section">
      <div class="section-title">Transaction History</div>
      <input class="txn-search" id="txnSearchInput" placeholder="Search transactions..." value="${txnSearch}">
      ${filtered.slice(0, 10).map(t => `
        <div class="txn-item">
          <div class="txn-avatar">${t.name.slice(0, 2).toUpperCase()}</div>
          <div class="txn-info">
            <div class="txn-name">${t.name}</div>
            <div class="txn-time">${formatTime(t.time)}</div>
          </div>
          <div class="txn-amt ${t.type}">${t.type === 'credit' ? '+' : '-'}₹${t.amount}</div>
        </div>
      `).join('')}
    </div>
  `;

  // Pay by input
  app.querySelector('#payInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = e.target.value.trim();
      if (val) { payTo = { name: val, upi: val }; payAmount = ''; navigate('amount'); }
    }
  });

  // Contact click
  app.querySelectorAll('.contact-item').forEach(item => {
    item.addEventListener('click', () => {
      payTo = { name: item.dataset.name, upi: item.dataset.upi };
      payAmount = '';
      navigate('amount');
    });
  });

  // Search
  app.querySelector('#txnSearchInput').addEventListener('input', e => {
    txnSearch = e.target.value;
    renderHome(app);
    // Restore focus
    const inp = app.querySelector('#txnSearchInput');
    inp.focus();
    inp.setSelectionRange(txnSearch.length, txnSearch.length);
  });
}

function renderAmount(app) {
  app.innerHTML = `
    <div class="header">
      <div class="header-row">
        <button class="back-btn" id="backBtn">←</button>
        <h2>Send Money</h2>
        <span></span>
      </div>
    </div>
    <div class="amount-screen">
      <div class="to-label">Paying to</div>
      <div class="to-name">${payTo.name} (${payTo.upi})</div>
      <div class="amount-display">₹${payAmount || '0'}</div>
      <div class="quick-chips">
        ${[100, 200, 500, 1000, 2000].map(v => `<span class="chip" data-val="${v}">₹${v}</span>`).join('')}
      </div>
      <div class="numpad" id="numpad">
        ${[1,2,3,4,5,6,7,8,9,'.',0,'⌫'].map(n =>
          `<button data-val="${n}">${n}</button>`
        ).join('')}
        <button class="pay" data-action="pay" style="grid-column:1/-1;" ${!payAmount ? 'disabled' : ''}>
          Pay ₹${payAmount || '0'}
        </button>
      </div>
    </div>
  `;

  app.querySelector('#backBtn').addEventListener('click', () => navigate('home'));

  app.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      payAmount = chip.dataset.val;
      renderAmount(app);
    });
  });

  app.querySelector('#numpad').addEventListener('click', e => {
    const val = e.target.dataset.val;
    const action = e.target.dataset.action;
    if (action === 'pay') {
      const amt = parseFloat(payAmount);
      if (amt > 0 && amt <= balance) { pin = ''; navigate('pin'); }
      else if (amt > balance) alert('Insufficient balance');
      return;
    }
    if (val === undefined) return;
    if (val === '⌫') payAmount = payAmount.slice(0, -1);
    else if (val === '.' && payAmount.includes('.')) return;
    else if (payAmount.length < 7) payAmount += val;
    renderAmount(app);
  });
}

function renderPin(app) {
  const pinLength = 4;
  app.innerHTML = `
    <div class="header">
      <div class="header-row">
        <button class="back-btn" id="backBtn">←</button>
        <h2>Enter UPI PIN</h2>
        <span></span>
      </div>
    </div>
    <div class="pin-screen">
      <div class="pin-label">Enter your 4-digit UPI PIN</div>
      <div class="pin-dots">
        ${Array.from({ length: pinLength }, (_, i) =>
          `<div class="pin-dot ${i < pin.length ? 'filled' : ''}"></div>`
        ).join('')}
      </div>
      <div class="pin-numpad" id="pinPad">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(n =>
          n === '' ? '<button disabled></button>' : `<button data-val="${n}">${n === '⌫' ? '⌫' : n}</button>`
        ).join('')}
      </div>
    </div>
  `;

  app.querySelector('#backBtn').addEventListener('click', () => navigate('amount'));

  app.querySelector('#pinPad').addEventListener('click', e => {
    const val = e.target.dataset.val;
    if (val === undefined) return;
    if (val === '⌫') { pin = pin.slice(0, -1); renderPin(app); return; }
    if (pin.length < pinLength) pin += val;
    if (pin.length === pinLength) {
      navigate('processing');
      // Simulate payment processing
      setTimeout(() => {
        paymentSuccess = Math.random() > 0.15; // 85% success rate
        if (paymentSuccess) balance -= parseFloat(payAmount);
        navigate('result');
      }, 2000);
      return;
    }
    renderPin(app);
  });
}

function renderProcessing(app) {
  app.innerHTML = `
    <div class="header"><div class="header-row"><span></span><h2>Processing</h2><span></span></div></div>
    <div class="processing">
      <div class="spinner"></div>
      <div class="processing-text">Processing your payment...</div>
      <div class="processing-sub">₹${payAmount} to ${payTo.name}</div>
    </div>
  `;
}

function renderResult(app) {
  const txnId = 'UPI' + Date.now().toString().slice(-10);
  app.innerHTML = `
    <div class="result">
      <div class="result-icon">${paymentSuccess ? '✅' : '❌'}</div>
      <div class="result-amount ${paymentSuccess ? 'success' : 'failure'}">
        ${paymentSuccess ? '' : 'Failed: '}₹${parseFloat(payAmount).toLocaleString('en-IN')}
      </div>
      <div class="result-to">${paymentSuccess ? 'Sent to' : 'Payment to'} ${payTo.name}</div>
      <div class="result-id">${txnId}<br>${new Date().toLocaleString('en-IN')}</div>
      ${paymentSuccess
        ? '<button class="result-btn primary" id="shareBtn">📋 Share Receipt</button>'
        : '<button class="result-btn primary" id="retryBtn">🔄 Retry Payment</button>'
      }
      <button class="result-btn secondary" id="homeBtn">Go to Home</button>
    </div>
  `;

  if (paymentSuccess) {
    app.querySelector('#shareBtn').addEventListener('click', () => {
      const text = `PhonePe Payment\nAmount: ₹${payAmount}\nTo: ${payTo.name} (${payTo.upi})\nTxn ID: ${txnId}\nDate: ${new Date().toLocaleString()}`;
      navigator.clipboard.writeText(text);
      app.querySelector('#shareBtn').textContent = '✓ Copied!';
    });
  } else {
    app.querySelector('#retryBtn').addEventListener('click', () => { pin = ''; navigate('pin'); });
  }
  app.querySelector('#homeBtn').addEventListener('click', () => navigate('home'));
}

function formatTime(date) {
  const diff = Date.now() - date;
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

render();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- PhonePe FE interviews focus on **payment UX flows** — screen-by-screen state machine
- **Screen routing**: `screen` state variable drives render switch — simple SPA without framework
- PIN entry: auto-submit at 4 digits, no submit button needed — matches real UPI apps
- Payment processing: 2-second timeout with spinner, 85% simulated success rate — realistic mock
- Quick amount chips (₹100, ₹200, etc.) for common amounts — reduces typing friction
- Contact avatars with initials — `name.slice(0, 2).toUpperCase()` — simple avatar generation
- Transaction search: re-render filtered list, restore cursor position after re-render
- Back navigation: each screen has back button to previous — stack-like navigation

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Strings |
| Technical 1 | Medium | DOM, CSS |
| Technical 2 | Hard | Payment Flow, State Machine, PIN |
| Hiring Manager | Medium | Fintech, UPI Payments |
